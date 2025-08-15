// src/commands/Nasa/marsweather.js
import axios from 'axios';

export default {
    name: 'marsweather',
    aliases: ['insightweather', 'martianweather'],
    description: 'Fetches the latest weather report from Nasa\'s InSight Mars lander.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the Mars Weather command.
     * Usage: !marsweather
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (not used).
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
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. Mars Weather command will likely hit rate limits or fail.");
            return;
        }

        await sock.sendMessage(chatId, { text: "🌬️🌡️ Fetching latest weather report from Mars..." }, { quoted: message });
        logger.info(`Fetching Mars weather by ${context.senderJid}`);

        try {
            // InSight Mars Weather API endpoint
            const apiUrl = `https://api.Nasa.gov/insight_weather/?api_key=${NasaApiKey}&feedtype=json&ver=1.0`;
            const response = await axios.get(apiUrl);
            const weatherData = response.data;

            if (!weatherData || !weatherData.sol_keys || weatherData.sol_keys.length === 0) {
                await sock.sendMessage(chatId, { text: "🤷‍♂️ Could not retrieve Mars weather data. The InSight lander might not be actively reporting, or data is temporarily unavailable." }, { quoted: message });
                logger.warn("Mars Weather API returned no data.");
                return;
            }

            // Get the latest sol (Martian day) data
            const latestSolKey = weatherData.sol_keys[weatherData.sol_keys.length - 1];
            const latestSolData = weatherData[latestSolKey];

            if (!latestSolData) {
                await sock.sendMessage(chatId, { text: "🤷‍♂️ No recent weather data available from Mars. Try again later!" }, { quoted: message });
                logger.warn("No latest sol data found in Mars Weather API response.");
                return;
            }

            const minTempC = latestSolData.AT?.mn || 'N/A';
            const maxTempC = latestSolData.AT?.mx || 'N/A';
            const pressurePa = latestSolData.PRE?.av || 'N/A'; // Average pressure
            const windSpeedMps = latestSolData.WS?.av || 'N/A'; // Average wind speed
            const season = latestSolData.Season || 'N/A';
            const firstUtc = latestSolData.First_UTC ? new Date(latestSolData.First_UTC).toUTCString() : 'N/A';
            const lastUtc = latestSolData.Last_UTC ? new Date(latestSolData.Last_UTC).toUTCString() : 'N/A';


            let reply = `*Mars Weather Report (Sol ${latestSolKey})*\n\n`;
            reply += `🗓️ Earth Date Range: ${firstUtc} - ${lastUtc}\n`;
            reply += `🌡️ Min Temp: ${minTempC}°C\n`;
            reply += `🌡️ Max Temp: ${maxTempC}°C\n`;
            reply += `💨 Avg Wind Speed: ${windSpeedMps} m/s\n`;
            reply += `📊 Avg Pressure: ${pressurePa} Pa\n`;
            reply += `🍃 Season: ${season}\n\n`;
            reply += `_Data from Nasa's InSight Lander._`;

            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            logger.info(`Sent Mars weather report for Sol ${latestSolKey}.`);

        } catch (error) {
            logger.error(`Error fetching Mars weather:`, error);
            let errorMessage = "❌ *Mars Weather Fetch Failed*\n\nAn error occurred while fetching Mars weather data.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.msg || error.response.data.error || 'Unknown API error'}.`;
                    if (error.response.status === 403 || error.response.status === 429) {
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