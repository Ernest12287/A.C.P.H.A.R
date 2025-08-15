// src/commands/Nasa/apod.js
import axios from 'axios';

export default {
    name: 'apod',
    aliases: ['astropod', 'Nasaapod'],
    description: 'Fetches and displays the Astronomy Picture of the Day from Nasa.',
    isPremium: false, // This command is free as per our discussion
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa', // New category for Nasa commands

    /**
     * Executes the APOD command.
     * Usage: !apod
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (not used for basic !apod).
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
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. APOD command will likely hit rate limits or fail.");
            // Proceed with DEMO_KEY for now, but warn the user.
        }

        await sock.sendMessage(chatId, { text: "🌌 Fetching today's Astronomy Picture of the Day..." }, { quoted: message });
        logger.info(`Fetching APOD for ${context.senderJid}`);

        try {
            const apiUrl = `https://api.Nasa.gov/planetary/apod?api_key=${NasaApiKey}`;
            const response = await axios.get(apiUrl);
            const apodData = response.data;

            if (!apodData) {
                await sock.sendMessage(chatId, { text: "🤷‍♂️ Could not retrieve APOD data. Please try again later." }, { quoted: message });
                logger.warn("APOD API returned no data.");
                return;
            }

            let caption = `*${apodData.title || 'Astronomy Picture of the Day'}*\n\n`;
            caption += `${apodData.explanation || 'No explanation provided.'}\n\n`;
            if (apodData.copyright) {
                caption += `©️ Copyright: ${apodData.copyright}\n`;
            }
            caption += `🗓️ Date: ${apodData.date || 'N/A'}`;

            if (apodData.media_type === 'image') {
                await sock.sendMessage(chatId, { image: { url: apodData.hdurl || apodData.url }, caption: caption }, { quoted: message });
                logger.info(`Sent APOD image for ${apodData.date}.`);
            } else if (apodData.media_type === 'video') {
                // For videos, Baileys usually expects a direct video file or a URL.
                // Sending the URL as text is the most reliable way for now.
                caption += `\n\n▶️ Watch Video: ${apodData.url}`;
                await sock.sendMessage(chatId, { text: caption }, { quoted: message });
                logger.info(`Sent APOD video link for ${apodData.date}.`);
            } else {
                await sock.sendMessage(chatId, { text: `🤷‍♂️ APOD media type not supported: ${apodData.media_type}. Here's the info:\n\n${caption}\n\nLink: ${apodData.url}` }, { quoted: message });
                logger.warn(`Unsupported APOD media type: ${apodData.media_type}`);
            }

        } catch (error) {
            logger.error(`Error fetching APOD:`, error);
            let errorMessage = "❌ *APOD Fetch Failed*\n\nAn error occurred while fetching the Astronomy Picture of the Day.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.msg || error.response.data.error || 'Unknown API error'}.`;
                    if (error.response.status === 403 || error.response.status === 429) {
                        errorMessage += "\nThis might be due to an invalid API key or exceeding rate limits. Please check your `Nasa_API_KEY` in `.env` and ensure you're not using the DEMO_KEY for frequent requests.";
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