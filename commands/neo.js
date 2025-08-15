// src/commands/Nasa/neo.js
import axios from 'axios';
import { format } from 'date-fns'; // For date formatting

export default {
    name: 'neo',
    aliases: ['asteroid', 'neofeeds'],
    description: 'Fetches information about Near-Earth Objects (asteroids/comets) for a given date range (default: today). Usage: !neo [YYYY-MM-DD]',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the NEO command.
     * Usage: !neo [YYYY-MM-DD]
     * Example: !neo
     * Example: !neo 2024-07-27
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
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. NEO command will likely hit rate limits or fail.");
            return;
        }

        let startDate;
        if (args.length > 0) {
            // Validate date format YYYY-MM-DD
            if (!/^\d{4}-\d{2}-\d{2}$/.test(args[0])) {
                return await sock.sendMessage(chatId, {
                    text: `🗓️ *Invalid Date Format*\n\nPlease provide the date in YYYY-MM-DD format. Example: \`${context.commandPrefix}neo 2024-07-27\``
                }, { quoted: message });
            }
            startDate = args[0];
        } else {
            // Default to today's date
            startDate = format(new Date(), 'yyyy-MM-dd');
        }

        // Nasa NEO API allows a 7-day range, but we'll fetch just for the start date for simplicity
        const endDate = startDate; // For a single day's data

        await sock.sendMessage(chatId, { text: `☄️ Searching for Near-Earth Objects for ${startDate}...` }, { quoted: message });
        logger.info(`Fetching NEOs for date: ${startDate} by ${context.senderJid}`);

        try {
            // Nasa NeoWs Feed API endpoint
            const apiUrl = `https://api.Nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NasaApiKey}`;
            const response = await axios.get(apiUrl);
            const neoData = response.data;

            if (!neoData || !neoData.near_earth_objects || Object.keys(neoData.near_earth_objects).length === 0) {
                await sock.sendMessage(chatId, { text: `✨ No Near-Earth Objects found for ${startDate}. All clear!` }, { quoted: message });
                logger.info(`No NEOs found for ${startDate}.`);
                return;
            }

            const neosToday = neoData.near_earth_objects[startDate];

            if (!neosToday || neosToday.length === 0) {
                await sock.sendMessage(chatId, { text: `✨ No Near-Earth Objects found for ${startDate}. All clear!` }, { quoted: message });
                logger.info(`No NEOs found for ${startDate}.`);
                return;
            }

            let reply = `☄️ *Near-Earth Objects for ${startDate}*\n\n`;
            let count = 0;

            for (const neo of neosToday) {
                if (count >= 5) { // Limit to top 5 for brevity
                    reply += `\n_...and ${neosToday.length - count} more._`;
                    break;
                }

                const isPotentiallyHazardous = neo.is_potentially_hazardous_asteroid ? 'Yes ⚠️' : 'No ✅';
                const closestApproach = neo.close_approach_data[0]; // Get the first (closest) approach data

                if (closestApproach) {
                    const missDistanceKm = parseFloat(closestApproach.miss_distance.kilometers).toLocaleString(undefined, { maximumFractionDigits: 0 });
                    const relativeVelocityKmh = parseFloat(closestApproach.relative_velocity.kilometers_per_hour).toLocaleString(undefined, { maximumFractionDigits: 0 });

                    reply += `*Name:* ${neo.name}\n`;
                    reply += `  - *Hazardous:* ${isPotentiallyHazardous}\n`;
                    reply += `  - *Est. Diameter:* ${neo.estimated_diameter.kilometers.min_diameter.toFixed(2)} - ${neo.estimated_diameter.kilometers.max_diameter.toFixed(2)} km\n`;
                    reply += `  - *Miss Distance:* ${missDistanceKm} km\n`;
                    reply += `  - *Relative Velocity:* ${relativeVelocityKmh} km/h\n`;
                    reply += `  - *Nasa JPL Link:* ${neo.Nasa_jpl_url}\n\n`;
                    count++;
                }
            }

            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            logger.info(`Sent NEO info for ${startDate}.`);

        } catch (error) {
            logger.error(`Error fetching NEOs for ${startDate}:`, error);
            let errorMessage = "❌ *NEO Fetch Failed*\n\nAn error occurred while fetching Near-Earth Objects data.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.error_message || error.response.data.msg || 'Unknown API error'}.`;
                    if (error.response.status === 400) {
                        errorMessage += "\nCheck if the date is valid and within the API's supported range (usually last 60 days from current date).";
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