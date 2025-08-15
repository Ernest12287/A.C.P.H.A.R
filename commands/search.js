// src/commands/utility/search.js
import axios from 'axios'; // Import axios for making HTTP requests

export default {
    name: 'search',
    aliases: ['ddg', 'find'],
    description: 'Searches DuckDuckGo for a query and returns a concise answer. (Free Tier - Rate Limits Apply)',
    isPremium: false, // As requested, not a premium command
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the search command.
     * Usage: !search <your_query>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `🔎 *Usage Error*\n\nPlease provide a query to search for. Example: \`${context.commandPrefix}search what is quantum physics\``
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: `🔎 Searching DuckDuckGo for "${query}"...` }, { quoted: message });
        logger.info(`Executing search command for query: "${query}" from ${context.senderJid}`);

        try {
            // DuckDuckGo Instant Answer API endpoint
            const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&t=ACEPHARBot`;

            const response = await axios.get(ddgApiUrl, {
                headers: {
                    'User-Agent': 'ACEPHARBot/1.0 (WhatsApp Bot)' // Identify your bot
                }
            });

            const data = response.data;
            let replyText = `🔎 *Search Results for "${query}"*\n\n`;
            let foundContent = false;

            // Prioritize direct answer/abstract
            if (data.AbstractText) {
                replyText += `*Summary:* ${data.AbstractText}\n`;
                if (data.AbstractURL) {
                    replyText += `*Source:* ${data.AbstractSource || 'Web'}\n${data.AbstractURL}\n`;
                }
                foundContent = true;
            } else if (data.Answer) {
                replyText += `*Answer:* ${data.Answer}\n`;
                if (data.AnswerType) {
                    replyText += `*Type:* ${data.AnswerType}\n`;
                }
                foundContent = true;
            } else if (data.Definition) {
                replyText += `*Definition:* ${data.Definition}\n`;
                if (data.DefinitionURL) {
                    replyText += `*Source:* ${data.DefinitionSource || 'Web'}\n${data.DefinitionURL}\n`;
                }
                foundContent = true;
            }

            // If no direct answer, try to get related topics or results
            if (!foundContent) {
                if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                    replyText += `*Related Topics:*\n`;
                    // Limit to top 3-5 related topics for brevity
                    data.RelatedTopics.slice(0, 3).forEach(topic => {
                        if (topic.Text) {
                            replyText += `- ${topic.Text}`;
                            if (topic.FirstURL) {
                                replyText += ` (${topic.FirstURL})`;
                            }
                            replyText += `\n`;
                        }
                    });
                    foundContent = true;
                } else if (data.Results && data.Results.length > 0) {
                    replyText += `*Top Results:*\n`;
                    // Limit to top 3-5 results for brevity
                    data.Results.slice(0, 3).forEach(result => {
                        if (result.Text) {
                            replyText += `- ${result.Text}`;
                            if (result.FirstURL) {
                                replyText += ` (${result.FirstURL})`;
                            }
                            replyText += `\n`;
                        }
                    });
                    foundContent = true;
                }
            }

            if (!foundContent) {
                replyText = `🤷‍♂️ *No direct results found for "${query}".*`;
                replyText += `\nYou can try a more specific query or visit DuckDuckGo directly: https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
            }

            await sock.sendMessage(chatId, { text: replyText }, { quoted: message });
            logger.info(`Search results sent for query: "${query}".`);

        } catch (error) {
            logger.error(`Error executing search command for "${query}":`, error);
            let errorMessage = '❌ *Search Failed*\n\nAn error occurred while performing the search. This might be due to:\n- Network issues.\n- Exceeding DuckDuckGo API rate limits (as it\'s a free service).\n- An invalid query.';
            
            // Check for common axios error types
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}.`;
                } else if (error.request) {
                    errorMessage += `\nNo response received from DuckDuckGo API.`;
                } else {
                    errorMessage += `\nError setting up request: ${error.message}.`;
                }
            } else {
                errorMessage += `\nError: ${error.message}.`;
            }

            await sock.sendMessage(chatId, { text: errorMessage }, { quoted: message });
        }
    },
};