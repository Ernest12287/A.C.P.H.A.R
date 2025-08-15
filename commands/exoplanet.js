// src/commands/Nasa/exoplanet.js
import axios from 'axios';

export default {
    name: 'exoplanet',
    aliases: ['planetsearch', 'alienworld'],
    description: '🌌 (PREMIUM) Searches Nasa\'s Exoplanet Archive for confirmed exoplanets. Usage: !exoplanet <planet_name>',
    isPremium: true, // This is a premium command
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the Exoplanet search command.
     * Usage: !exoplanet <planet_name>
     * Example: !exoplanet Kepler-186f
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const NasaApiKey = process.env.Nasa_API_KEY;

        if (!NasaApiKey || NasaApiKey === 'DEMO_KEY') {
            await sock.sendMessage(chatId, {
                text: "❌ *Nasa API Key Missing/Demo Key Used*\n\nPlease set your `Nasa_API_KEY` in the `.env` file with a valid key from `api.Nasa.gov` for full functionality and higher rate limits."
            }, { quoted: message });
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. Exoplanet command will likely hit rate limits or fail.");
            return;
        }

        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `🔭 *Usage Error*\n\nPlease provide an exoplanet name to search for. Example: \`${context.commandPrefix}exoplanet Kepler-186f\` or \`${context.commandPrefix}exoplanet WASP-12b\``
            }, { quoted: message });
        }

        const query = args.join(' ').trim();

        await sock.sendMessage(chatId, { text: `🔭 Searching Nasa's Exoplanet Archive for "${query}"...` }, { quoted: message });
        logger.info(`Searching Exoplanet Archive for: "${query}" by ${context.senderJid}`);

        try {
            // Nasa Exoplanet Archive TAP (Table Access Protocol) service
            // Using a more robust set of common columns.
            // Removed 'st_dist' which caused the ORA-00904 error.
            const adqlQuery = `select+pl_name,disc_year,sy_snum,sy_pnum,st_teff,pl_orbper,pl_rade,pl_bmassj+from+pscomppars+where+upper(pl_name)+like+'%${query.toUpperCase()}%'`;
            const apiUrl = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${adqlQuery}&format=json&api_key=${NasaApiKey}`;

            const response = await axios.get(apiUrl);
            const exoplanets = response.data;

            if (!exoplanets || exoplanets.length === 0) {
                await sock.sendMessage(chatId, { text: `🤷‍♀️ No exoplanets found matching "${query}". Try a different name or a more general search.` }, { quoted: message });
                logger.info(`No exoplanets found for "${query}".`);
                return;
            }

            // Send up to 3 results for brevity
            const resultsToSend = exoplanets.slice(0, Math.min(exoplanets.length, 3));
            logger.info(`Found ${exoplanets.length} exoplanets, sending ${resultsToSend.length}.`);

            for (const planet of resultsToSend) {
                let reply = `*Exoplanet: ${planet.pl_name}*\n\n`;
                reply += `Discovery Year: ${planet.disc_year || 'N/A'}\n`;
                reply += `Number of Stars: ${planet.sy_snum || 'N/A'}\n`;
                reply += `Number of Planets: ${planet.sy_pnum || 'N/A'}\n`;
                // Removed st_dist
                reply += `Star Temperature: ${planet.st_teff ? `${planet.st_teff.toFixed(0)} K` : 'N/A'}\n`;
                reply += `Orbital Period: ${planet.pl_orbper ? `${planet.pl_orbper.toFixed(2)} days` : 'N/A'}\n`;
                reply += `Radius (relative to Earth): ${planet.pl_rade ? `${planet.pl_rade.toFixed(2)} Earth Radii` : 'N/A'}\n`;
                reply += `Mass (relative to Jupiter): ${planet.pl_bmassj ? `${planet.pl_bmassj.toFixed(2)} Jupiter Masses` : 'N/A'}\n`;

                await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            }

            if (exoplanets.length > 3) {
                await sock.sendMessage(chatId, { text: `_Found ${exoplanets.length - 3} more exoplanets. Try a more specific query or visit Nasa's Exoplanet Archive for more: https://exoplanetarchive.ipac.caltech.edu/index.html_` }, { quoted: message });
            }

        } catch (error) {
            logger.error(`Error fetching exoplanet data for "${query}":`, error);
            let errorMessage = "❌ *Exoplanet Search Failed*\n\nAn error occurred while fetching exoplanet data.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data || 'Unknown API error'}.`; // API returns XML for 400, so data might be string
                    if (error.response.status === 400) {
                        errorMessage += "\nThis might indicate an issue with the query parameters or the Exoplanet Archive API itself. Please try a simpler query like 'Kepler-186f'.";
                    } else if (error.response.status === 403 || error.response.status === 429) {
                        errorMessage += "\nThis might be due to an invalid API key or exceeding rate limits. Please check your `Nasa_API_KEY` in `.env`.";
                    }
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