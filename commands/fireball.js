// src/commands/nasa/fireball.js
import axios from 'axios';
import { format, subDays } from 'date-fns';

export default {
    name: 'fireball',
    aliases: ['meteor', 'impact'],
    description: '🔥 (PREMIUM) Fetches data on recent atmospheric impact events (meteors/fireballs) reported by NASA.',
    isPremium: true, // This is a premium command
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa', // Consistent category name

    /**
     * Executes the Fireball command.
     * Usage: !fireball [days_back]
     * Example: !fireball (for last 7 days)
     * Example: !fireball 30 (for last 30 days)
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        // The Fireball API (ssd-api.jpl.nasa.gov) does NOT use the generic NASA_API_KEY.
        // It's publicly accessible without a key.
        // Keeping the check for the key in case it's needed for other SSD APIs,
        // but it won't be passed in the URL for this specific endpoint.
        const nasaApiKey = process.env.NASA_API_KEY; // Still good to have this defined for consistency

        if (args.length > 0) {
            const parsedDays = parseInt(args[0]);
            if (!isNaN(parsedDays) && parsedDays > 0 && parsedDays <= 90) { // API usually supports up to 90 days
                daysBack = parsedDays;
            } else {
                return await sock.sendMessage(chatId, {
                    text: `🔢 *Invalid Days Back*\n\nPlease provide a number of days (1-90) to look back. Example: \`${context.commandPrefix}fireball 30\``
                }, { quoted: message });
            }
        }

        const today = new Date();
        const startDate = format(subDays(today, daysBack), 'yyyy-MM-dd');
        const endDate = format(today, 'yyyy-MM-dd');

        await sock.sendMessage(chatId, { text: `🔥 Searching for fireball events in the last ${daysBack} days...` }, { quoted: message });
        logger.info(`Fetching fireball events for last ${daysBack} days by ${context.senderJid}`);

        try {
            // NASA Fireball API endpoint - REMOVED api_key parameter
            const apiUrl = `https://ssd-api.jpl.nasa.gov/fireball.api?date-min=${startDate}&date-max=${endDate}`;
            const response = await axios.get(apiUrl);
            const fireballs = response.data.data; // The actual data is in the 'data' array

            if (!fireballs || fireballs.length === 0) {
                await sock.sendMessage(chatId, { text: `✨ No fireball events reported in the last ${daysBack} days. All clear!` }, { quoted: message });
                logger.info(`No fireball events found in last ${daysBack} days.`);
                return;
            }

            let reply = `*Recent Fireball Events (Last ${daysBack} Days)*\n\n`;
            let count = 0;

            const headerMap = response.data.fields; // Get headers from the API response

            const getDate = (item) => item[headerMap.indexOf('date')];
            const getLat = (item) => item[headerMap.indexOf('lat')];
            const getLon = (item) => item[headerMap.indexOf('lon')];
            const getEnergy = (item) => parseFloat(item[headerMap.indexOf('energy')]); // kT

            // Sort by energy (highest first)
            fireballs.sort((a, b) => getEnergy(b) - getEnergy(a));

            for (const fireball of fireballs) {
                if (count >= 5) { // Limit to top 5 for brevity
                    reply += `\n_...and ${fireballs.length - count} more._`;
                    break;
                }

                const date = getDate(fireball);
                const lat = getLat(fireball);
                const lon = getLon(fireball);
                const energy = getEnergy(fireball); // Kilotons

                reply += `*Event on ${date}*\n`;
                reply += `  - *Coordinates:* Lat ${lat}, Lon ${lon}\n`;
                reply += `  - *Est. Energy:* ${energy.toFixed(2)} kT (kilotons of TNT)\n`;
                reply += `  - *More Info:* https://cneos.jpl.nasa.gov/fireballs/\n\n`; // General link for more info
                count++;
            }

            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            logger.info(`Sent fireball event info.`);

        } catch (error) {
            logger.error(`Error fetching fireball events:`, error);
            let errorMessage = "❌ *Fireball Fetch Failed*\n\nAn error occurred while fetching fireball data.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.message || error.response.data.error || 'Unknown API error'}.`;
                    if (error.response.status === 400) {
                        errorMessage += "\nCheck if the date range is valid (max 90 days).";
                    }
                } else if (error.request) {
                    errorMessage += "\nNo response received from NASA API. Check your internet connection.";
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