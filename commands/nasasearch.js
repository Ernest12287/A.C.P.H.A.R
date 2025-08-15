// src/commands/Nasa/Nasasearch.js
import axios from 'axios';

export default {
    name: 'Nasasearch',
    aliases: ['Nasaimage', 'Nasavideo', 'Nasalibrary'],
    description: 'Searches Nasa\'s Image and Video Library. Usage: !Nasasearch <query> [image|video]',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the Nasa Image and Video Library search command.
     * Usage: !Nasasearch <query> [image|video]
     * Example: !Nasasearch apollo 11
     * Example: !Nasasearch hubble telescope image
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;

        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `📚 *Usage Error*\n\nPlease provide a search query. Example: \`${context.commandPrefix}Nasasearch moon landing\``
            }, { quoted: message });
        }

        let query = args.join(' ');
        let mediaType = ''; // Default to all media types

        // Check if the last argument is a media type filter
        const lastArg = args[args.length - 1].toLowerCase();
        if (lastArg === 'image' || lastArg === 'video') {
            mediaType = lastArg;
            query = args.slice(0, -1).join(' '); // Remove media type from query
        }

        if (!query) {
             return await sock.sendMessage(chatId, {
                text: `📚 *Usage Error*\n\nPlease provide a search query. Example: \`${context.commandPrefix}Nasasearch moon landing\``
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: `🔍 Searching Nasa's library for "${query}" (${mediaType || 'all media'})...` }, { quoted: message });
        logger.info(`Searching Nasa library for: "${query}" (${mediaType || 'all'}) by ${context.senderJid}`);

        try {
            const apiUrl = `https://images-api.Nasa.gov/search?q=${encodeURIComponent(query)}${mediaType ? `&media_type=${mediaType}` : ''}`;
            const response = await axios.get(apiUrl);
            const items = response.data.collection.items;

            if (!items || items.length === 0) {
                await sock.sendMessage(chatId, { text: `🤷‍♀️ No ${mediaType || 'media'} found for "${query}" in Nasa's library.` }, { quoted: message });
                logger.info(`No Nasa media found for "${query}".`);
                return;
            }

            // Send up to 3 results for brevity
            const resultsToSend = items.slice(0, Math.min(items.length, 3));
            logger.info(`Found ${items.length} Nasa media items, sending ${resultsToSend.length}.`);

            for (const item of resultsToSend) {
                const data = item.data[0];
                const links = item.links;

                let mediaUrl = '';
                let isVideo = false;

                if (data.media_type === 'image' && links && links.length > 0) {
                    // Find the largest image link
                    const imageLink = links.find(l => l.rel === 'preview' && l.render === 'image') || links[0];
                    mediaUrl = imageLink ? imageLink.href : '';
                } else if (data.media_type === 'video' && links && links.length > 0) {
                    // For videos, the direct video URL is often in the "orig" or "large" asset
                    // This often requires another API call to the asset manifest, which is complex for a simple command.
                    // For simplicity, we'll just provide the Nasa library link.
                    mediaUrl = `https://images.Nasa.gov/details-${data.Nasa_id}.html`;
                    isVideo = true;
                }

                let caption = `*${data.title || 'Untitled'}*\n\n`;
                if (data.description) {
                    caption += `_Description:_ ${data.description.substring(0, 200)}${data.description.length > 200 ? '...' : ''}\n`;
                }
                caption += `🗓️ Date: ${data.date_created ? data.date_created.split('T')[0] : 'N/A'}\n`;
                if (data.photographer) {
                    caption += `📸 Photographer: ${data.photographer}\n`;
                }
                if (data.keywords && data.keywords.length > 0) {
                    caption += `🏷️ Keywords: ${data.keywords.slice(0, 5).join(', ')}${data.keywords.length > 5 ? '...' : ''}\n`;
                }
                if (isVideo) {
                    caption += `\n▶️ Watch Video/Details: ${mediaUrl}`;
                } else if (mediaUrl) {
                    caption += `\n🔗 Source: ${mediaUrl}`;
                }


                if (data.media_type === 'image' && mediaUrl) {
                    await sock.sendMessage(chatId, { image: { url: mediaUrl }, caption: caption }, { quoted: message });
                } else if (data.media_type === 'video' && mediaUrl) {
                    // Send video link as text, as direct video sending can be complex
                    await sock.sendMessage(chatId, { text: caption }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, { text: `🤷‍♀️ Could not display media for "${data.title}". Here's the info:\n\n${caption}` }, { quoted: message });
                }
            }

            if (items.length > 3) {
                await sock.sendMessage(chatId, { text: `_Found ${items.length - 3} more results. Visit https://images.Nasa.gov/ to explore further._` }, { quoted: message });
            }

        } catch (error) {
            logger.error(`Error executing Nasa search for "${query}":`, error);
            let errorMessage = "❌ *Nasa Search Failed*\n\nAn error occurred while searching Nasa's library.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.reason || error.response.data.message || 'Unknown API error'}.`;
                } else if (error.request) {
                    errorMessage += "\nNo response received from Nasa API. Check your internet connection.";
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