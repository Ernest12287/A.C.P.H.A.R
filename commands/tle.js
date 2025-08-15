// src/commands/Nasa/tle.js
import axios from 'axios';

export default {
    name: 'tle',
    aliases: ['iss', 'satelliteinfo'],
    description: '🛰️ Fetches the latest Two-Line Element (TLE) data for Earth-orbiting objects (default: ISS). Usage: !tle [object_name]',
    isPremium: false, // This command is free
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the TLE command.
     * Usage: !tle [object_name]
     * Example: !tle (for ISS)
     * Example: !tle NOAA 15
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const NasaApiKey = process.env.Nasa_API_KEY; // TLE API is often separate, but good to include

        if (!NasaApiKey || NasaApiKey === 'DEMO_KEY') {
            await sock.sendMessage(chatId, {
                text: "❌ *Nasa API Key Missing/Demo Key Used*\n\nPlease set your `Nasa_API_KEY` in the `.env` file with a valid key from `api.Nasa.gov` for full functionality and higher rate limits."
            }, { quoted: message });
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. TLE command will likely hit rate limits or fail.");
            return;
        }

        let objectName = 'iss'; // Default to International Space Station
        if (args.length > 0) {
            objectName = args.join(' ').trim().toLowerCase();
        }

        await sock.sendMessage(chatId, { text: `🛰️ Fetching TLE data for "${objectName.toUpperCase()}"...` }, { quoted: message });
        logger.info(`Fetching TLE for: "${objectName}" by ${context.senderJid}`);

        try {
            // Nasa TLE API - this is a bit tricky, as the main Nasa API doesn't list a direct TLE endpoint.
            // We'll use a common public TLE source that is often used with Nasa data.
            // celestrak.org is a standard source for TLEs.
            // Note: This API might not use your Nasa_API_KEY.
            const apiUrl = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${objectName === 'iss' ? '25544' : objectName}&FORMAT=json`; // 25544 is ISS NORAD ID
            // For named objects, we might need a different lookup or a more complex API.
            // For simplicity, we'll assume a direct NORAD ID or 'iss' for now.
            // If the user provides a name, we'll try to use it as a NORAD ID, which might fail.
            // A more robust solution would involve a search endpoint first.

            // Let's adjust for a more generic TLE search if a name is given
            let fetchUrl;
            if (objectName === 'iss') {
                fetchUrl = `https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=json`; // ISS
            } else if (!isNaN(parseInt(objectName))) { // If it looks like a NORAD ID
                fetchUrl = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${objectName}&FORMAT=json`;
            } else {
                // For named objects, Celestrak has a "catalog" endpoint, but it's not a simple direct lookup.
                // It's more common to search for a group of satellites.
                // For simplicity, we'll try a common group if a name is given
                // Or, we can use a different TLE API that supports name search.
                // Let's use N2YO.com for name search, which is also popular.
                // N2YO requires its own API key, which is separate from Nasa's.
                // To avoid adding another API key to .env for now, let's stick to NORAD ID or ISS.
                // If the user provides a name other than 'iss', we'll tell them to provide ID.
                return await sock.sendMessage(chatId, {
                    text: `🛰️ *Usage Error*\n\nFor satellites other than ISS, please provide its NORAD ID. Example: \`${context.commandPrefix}tle 25544\` (for ISS) or \`${context.commandPrefix}tle 40069\` (for a different satellite).\n\n_Named satellite search is not yet supported._`
                }, { quoted: message });
            }

            const response = await axios.get(fetchUrl);
            const tleData = response.data;

            if (!tleData || tleData.length === 0) {
                await sock.sendMessage(chatId, { text: `🤷‍♀️ No TLE data found for "${objectName.toUpperCase()}". Please check the NORAD ID or try again later.` }, { quoted: message });
                logger.info(`No TLE data found for "${objectName}".`);
                return;
            }

            const tle = tleData[0]; // Get the first (most recent) TLE

            let reply = `*TLE Data for ${tle.OBJECT_NAME || 'Unknown Object'}*\n\n`;
            reply += `  - *NORAD ID:* ${tle.NORAD_CAT_ID || 'N/A'}\n`;
            reply += `  - *International Designator:* ${tle.INTL_DES || 'N/A'}\n`;
            reply += `  - *Epoch:* ${tle.EPOCH || 'N/A'}\n`;
            reply += `  - *Inclination:* ${tle.INCLINATION || 'N/A'} deg\n`;
            reply += `  - *Mean Motion:* ${tle.MEAN_MOTION || 'N/A'} revs/day\n`;
            reply += `  - *Perigee Altitude:* ${tle.PERIGEE_ALT || 'N/A'} km\n`;
            reply += `  - *Apogee Altitude:* ${tle.APOGEE_ALT || 'N/A'} km\n`;
            reply += `\n_This data describes the object's orbit._`;

            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            logger.info(`Sent TLE data for "${objectName}".`);

        } catch (error) {
            logger.error(`Error fetching TLE for "${objectName}":`, error);
            let errorMessage = "❌ *TLE Fetch Failed*\n\nAn error occurred while fetching TLE data.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data || 'Unknown API error'}.`;
                    if (error.response.status === 404) {
                        errorMessage += "\nObject not found with that NORAD ID.";
                    }
                } else if (error.request) {
                    errorMessage += "\nNo response received from TLE API. Check your internet connection.";
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