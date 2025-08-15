// src/commands/nasa/genelab.js
import axios from 'axios';

export default {
    name: 'genelab',
    aliases: ['spacebiology', 'osdrsearch'],
    description: '🧬 (PREMIUM) Searches NASA\'s GeneLab for space biology data. Usage: !genelab <query>',
    isPremium: true, // This is a premium command
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa', // Consistent category name

    /**
     * Executes the GeneLab search command.
     * Usage: !genelab <query>
     * Example: !genelab mouse radiation
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        // GeneLab API (OSDR) does not use the generic NASA_API_KEY parameter.
        // It's publicly accessible without a key for basic searches.
        // We'll still keep the check for the key in case it's needed for other OSDR endpoints in the future,
        // but it won't be passed in the URL for this specific search.

        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `🧬 *Usage Error*\n\nPlease provide a search query for GeneLab data. Example: \`${context.commandPrefix}genelab plant growth\``
            }, { quoted: message });
        }

        const query = args.join(' ').trim();

        await sock.sendMessage(chatId, { text: `🧬 Searching NASA GeneLab for data related to "${query}"...` }, { quoted: message });
        logger.info(`Searching GeneLab for: "${query}" by ${context.senderJid}`);

        try {
            // CORRECTED GeneLab API endpoint for searching studies
            const apiUrl = `https://osdr.nasa.gov/osdr/api/search/studies?q=${encodeURIComponent(query)}&format=json`;
            // Removed api_key from URL as it's not supported for this endpoint.

            const response = await axios.get(apiUrl);
            const studies = response.data.results; // Assuming 'results' is the key for relevant data

            if (!studies || studies.length === 0) {
                await sock.sendMessage(chatId, { text: `🤷‍♀️ No GeneLab studies found for "${query}". Try a different query.` }, { quoted: message });
                logger.info(`No GeneLab studies found for "${query}".`);
                return;
            }

            // Send up to 3 results for brevity
            const resultsToSend = studies.slice(0, Math.min(studies.length, 3));
            logger.info(`Found ${studies.length} GeneLab studies, sending ${resultsToSend.length}.`);

            for (const study of resultsToSend) {
                let reply = `*GeneLab Study: ${study.study_name || 'Untitled'}*\n\n`;
                reply += `  - *Accession:* ${study.study_accession || 'N/A'}\n`;
                reply += `  - *Description:* ${study.study_description ? study.study_description.substring(0, 150) + (study.study_description.length > 150 ? '...' : '') : 'N/A'}\n`;
                reply += `  - *Organism:* ${study.organism || 'N/A'}\n`;
                reply += `  - *Mission:* ${study.mission || 'N/A'}\n`;
                reply += `  - *View Details:* ${study.study_url || 'N/A'}\n\n`;

                await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            }

            if (studies.length > 3) {
                await sock.sendMessage(chatId, { text: `_Found ${studies.length - 3} more studies. Visit https://genelab.nasa.gov/ for more._` }, { quoted: message });
            }

        } catch (error) {
            logger.error(`Error fetching GeneLab data for "${query}":`, error);
            let errorMessage = "❌ *GeneLab Search Failed*\n\nAn error occurred while fetching GeneLab data.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.message || error.response.data.error || 'Unknown API error'}.`;
                    if (error.response.status === 404) {
                        errorMessage += "\nAPI endpoint not found. The GeneLab API might have changed or is temporarily unavailable.";
                    }
                } else if (error.request) {
                    errorMessage += "\nNo response received from GeneLab API. Check your internet connection.";
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