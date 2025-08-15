// src/commands/Nasa/spaceweatheralert.js
import axios from 'axios';
import { format, subDays } from 'date-fns';

export default {
    name: 'spaceweatheralert',
    aliases: ['solaralert', 'cme', 'flare'],
    description: '☀️ (PREMIUM) Fetches recent Solar Flare and Coronal Mass Ejection (CME) alerts from Nasa.',
    isPremium: true, // This is a premium command
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the Space Weather Alert command.
     * Usage: !spaceweatheralert
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
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. Space Weather Alert command will likely hit rate limits or fail.");
            return;
        }

        const today = new Date();
        const startDate = format(subDays(today, 7), 'yyyy-MM-dd'); // Last 7 days
        const endDate = format(today, 'yyyy-MM-dd');

        await sock.sendMessage(chatId, { text: `☀️ Fetching space weather alerts from ${startDate} to ${endDate}...` }, { quoted: message });
        logger.info(`Fetching space weather alerts by ${context.senderJid}`);

        try {
            // Fetch Solar Flares
            const flaresApiUrl = `https://api.Nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${NasaApiKey}`;
            const flaresResponse = await axios.get(flaresApiUrl);
            const flares = flaresResponse.data;

            // Fetch Coronal Mass Ejections (CMEs)
            const cmesApiUrl = `https://api.Nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${NasaApiKey}`;
            const cmesResponse = await axios.get(cmesApiUrl);
            const cmes = cmesResponse.data;

            let reply = `*Space Weather Alerts (${startDate} to ${endDate})*\n\n`;
            let foundAlerts = false;

            if (flares && flares.length > 0) {
                reply += `*🚨 Solar Flares:*\n`;
                flares.slice(0, 3).forEach(flare => { // Limit to 3
                    reply += `- Class ${flare.class_type} on ${flare.beginTime.split('T')[0]} at ${flare.beginTime.split('T')[1].substring(0, 5)} UTC\n`;
                    if (flare.sourceLocation) reply += `  Source: ${flare.sourceLocation}\n`;
                });
                if (flares.length > 3) reply += `_...and ${flares.length - 3} more flares._\n`;
                foundAlerts = true;
            }

            if (cmes && cmes.length > 0) {
                if (foundAlerts) reply += `\n`; // Add separator if flares were found
                reply += `*💥 Coronal Mass Ejections (CMEs):*\n`;
                cmes.slice(0, 3).forEach(cme => { // Limit to 3
                    reply += `- CME on ${cme.startTime.split('T')[0]} at ${cme.startTime.split('T')[1].substring(0, 5)} UTC\n`;
                    if (cme.cmeAnalyses && cme.cmeAnalyses.length > 0) {
                        const analysis = cme.cmeAnalyses[0];
                        reply += `  Speed: ${analysis.speed || 'N/A'} km/s, Half-Angle: ${analysis.halfAngle || 'N/A'} deg\n`;
                    }
                });
                if (cmes.length > 3) reply += `_...and ${cmes.length - 3} more CMEs._\n`;
                foundAlerts = true;
            }

            if (!foundAlerts) {
                reply += `✅ No significant solar flares or CMEs reported in the last 7 days. All clear!\n`;
            }

            reply += `\n_Data from Nasa's Space Weather Database (DONKI)._`;

            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            logger.info(`Sent space weather alerts.`);

        } catch (error) {
            logger.error(`Error fetching space weather alerts:`, error);
            let errorMessage = "❌ *Space Weather Fetch Failed*\n\nAn error occurred while fetching space weather data.";
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