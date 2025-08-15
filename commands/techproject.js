// src/commands/nasa/techproject.js
import axios from 'axios';

export default {
    name: 'techproject',
    aliases: ['nasatech', 'projectsearch'],
    description: '🔬 Searches NASA\'s TechPort database for technology projects. Usage: !techproject <query>',
    isPremium: false, // This command is free
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa', // Consistent category name

    /**
     * Executes the TechProject search command.
     * Usage: !techproject <query>
     * Example: !techproject Mars Rover
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const nasaApiKey = process.env.NASA_API_KEY;

        if (!nasaApiKey || nasaApiKey === 'DEMO_KEY') {
            await sock.sendMessage(chatId, {
                text: "❌ *NASA API Key Missing/Demo Key Used*\n\nPlease set your `NASA_API_KEY` in the `.env` file with a valid key from `api.nasa.gov` for full functionality and higher rate limits."
            }, { quoted: message });
            logger.warn("NASA_API_KEY is missing or set to DEMO_KEY. TechProject command will likely hit rate limits or fail.");
            return;
        }

        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `🔬 *Usage Error*\n\nPlease provide a search query for NASA technology projects. Example: \`${context.commandPrefix}techproject space launch system\``
            }, { quoted: message });
        }

        const query = args.join(' ').trim();

        await sock.sendMessage(chatId, { text: `🔬 Searching NASA TechPort for projects related to "${query}"...` }, { quoted: message });
        logger.info(`Searching TechPort for: "${query}" by ${context.senderJid}`);

        try {
            const apiUrl = `https://api.nasa.gov/techport/api/projects/search?q=${encodeURIComponent(query)}&api_key=${nasaApiKey}`;
            const response = await axios.get(apiUrl);
            const projects = response.data.projects;

            if (!projects || projects.length === 0) {
                await sock.sendMessage(chatId, { text: `🤷‍♀️ No NASA technology projects found for "${query}". Try a different query.` }, { quoted: message });
                logger.info(`No TechPort projects found for "${query}".`);
                return;
            }

            const resultsToSend = projects.slice(0, Math.min(projects.length, 3));
            logger.info(`Found ${projects.length} TechPort projects, sending ${resultsToSend.length}.`);

            for (const project of resultsToSend) {
                let reply = `*NASA Tech Project: ${project.title || 'Untitled'}*\n\n`;
                reply += `  - *ID:* ${project.id}\n`;
                reply += `  - *Status:* ${project.status || 'N/A'}\n`;
                reply += `  - *Lead Org:* ${project.leadOrganization?.organizationName || 'N/A'}\n`;
                if (project.description) {
                    reply += `  - *Description:* ${project.description.substring(0, 150)}${project.description.length > 150 ? '...' : ''}\n`;
                }
                reply += `  - *Year:* ${project.startYear || 'N/A'}\n`;
                reply += `  - *View Details:* https://techport.nasa.gov/view/${project.id}\n\n`;

                await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            }

            if (projects.length > 3) {
                await sock.sendMessage(chatId, { text: `_Found ${projects.length - 3} more projects. Visit https://techport.nasa.gov/ for more._` }, { quoted: message });
            }

        } catch (error) {
            logger.error(`Error fetching TechPort projects for "${query}":`, error);
            let errorMessage = "❌ *TechPort Search Failed*\n\nAn error occurred while fetching NASA technology projects.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.message || error.response.data.error || 'Unknown API error'}.`;
                    if (error.response.status === 503) {
                        errorMessage += "\nThis is a temporary service issue on NASA's side. Please try again in a few minutes.";
                    } else if (error.response.status === 403 || error.response.status === 429) {
                        errorMessage += "\nThis might be due to an invalid API key or exceeding rate limits. Please check your `NASA_API_KEY` in `.env`.";
                    } else if (error.response.status === 404) {
                        errorMessage += "\nNo projects found or API endpoint issue.";
                    }
                } else if (error.request) {
                    errorMessage += "\nNo response received from NASA API. Check your internet connection or try again later.";
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