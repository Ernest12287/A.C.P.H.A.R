// src/commands/Nasa/asteroidinfo.js
import axios from 'axios';

export default {
    name: 'asteroidinfo',
    aliases: ['neo_lookup', 'asteroidlookup'],
    description: '☄️ Fetches detailed information about a specific Near-Earth Object (asteroid) by its Nasa JPL ID. Usage: !asteroidinfo <JPL_ID>',
    isPremium: false, // This command is free
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the Asteroid Info command.
     * Usage: !asteroidinfo <JPL_ID>
     * Example: !asteroidinfo 2000433 (for 433 Eros)
     * Example: !asteroidinfo 3727768 (for 2016 HO3, Earth's quasi-moon)
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
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. Asteroid Info command will likely hit rate limits or fail.");
            return;
        }

        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `☄️ *Usage Error*\n\nPlease provide the Nasa JPL ID of the asteroid. Examples:\n` +
                      `\`${context.commandPrefix}asteroidinfo 2000433\` (for 433 Eros)\n` +
                      `\`${context.commandPrefix}asteroidinfo 3727768\` (for 2016 HO3, Earth's quasi-moon)`
            }, { quoted: message });
        }

        const asteroidId = args[0];
        if (isNaN(parseInt(asteroidId))) {
            return await sock.sendMessage(chatId, {
                text: `☄️ *Invalid ID*\n\nThe asteroid ID must be a number. Examples:\n` +
                      `\`${context.commandPrefix}asteroidinfo 2000433\` (for 433 Eros)\n` +
                      `\`${context.commandPrefix}asteroidinfo 3727768\` (for 2016 HO3, Earth's quasi-moon)`
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: `☄️ Fetching details for asteroid ID: ${asteroidId}...` }, { quoted: message });
        logger.info(`Fetching asteroid info for ID: ${asteroidId} by ${context.senderJid}`);

        try {
            // Nasa NeoWs Lookup API endpoint
            const apiUrl = `https://api.Nasa.gov/neo/rest/v1/neo/${asteroidId}?api_key=${NasaApiKey}`;
            const response = await axios.get(apiUrl);
            const asteroidData = response.data;

            if (!asteroidData) {
                await sock.sendMessage(chatId, { text: `🤷‍♂️ No asteroid found with ID: ${asteroidId}.` }, { quoted: message });
                logger.info(`No asteroid found with ID: ${asteroidId}.`);
                return;
            }

            let reply = `*Asteroid Details: ${asteroidData.name}*\n\n`;
            reply += `  - *JPL ID:* ${asteroidData.neo_reference_id}\n`;
            reply += `  - *Hazardous:* ${asteroidData.is_potentially_hazardous_asteroid ? 'Yes ⚠️' : 'No ✅'}\n`;
            reply += `  - *Nasa JPL Link:* ${asteroidData.Nasa_jpl_url}\n`;
            reply += `  - *Absolute Magnitude:* ${asteroidData.absolute_magnitude_h || 'N/A'}\n`;
            reply += `  - *Est. Diameter (km):* ${asteroidData.estimated_diameter.kilometers.min_diameter.toFixed(2)} - ${asteroidData.estimated_diameter.kilometers.max_diameter.toFixed(2)}\n`;

            if (asteroidData.close_approach_data && asteroidData.close_approach_data.length > 0) {
                const latestApproach = asteroidData.close_approach_data[0]; // Get the most recent approach
                reply += `\n*Latest Close Approach:*\n`;
                reply += `  - Date: ${latestApproach.close_approach_date}\n`;
                reply += `  - Miss Distance: ${parseFloat(latestApproach.miss_distance.kilometers).toLocaleString(undefined, { maximumFractionDigits: 0 })} km\n`;
                reply += `  - Relative Velocity: ${parseFloat(latestApproach.relative_velocity.kilometers_per_hour).toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h\n`;
            } else {
                reply += `\n_No close approach data available._\n`;
            }

            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            logger.info(`Sent asteroid info for ID: ${asteroidId}.`);

        } catch (error) {
            logger.error(`Error fetching asteroid info for ID: ${asteroidId}:`, error);
            let errorMessage = "❌ *Asteroid Info Fetch Failed*\n\nAn error occurred while fetching asteroid details.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.error_message || error.response.data.msg || 'Unknown API error'}.`;
                    if (error.response.status === 404) {
                        errorMessage += "\nAsteroid not found with that ID. Please check the ID.";
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