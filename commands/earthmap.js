// src/commands/Nasa/earthmap.js
import axios from 'axios';
import { format, subDays } from 'date-fns';

export default {
    name: 'earthmap',
    aliases: ['earthimagecoords', 'gibs'],
    description: '🗺️ (PREMIUM) Fetches a satellite image of Earth for given coordinates and date. Usage: !earthmap <latitude> <longitude> [YYYY-MM-DD]',
    isPremium: true, // This is a premium command
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the Earth Map command.
     * Usage: !earthmap <latitude> <longitude> [YYYY-MM-DD]
     * Example: !earthmap 34.0522 -118.2437 (for Los Angeles today)
     * Example: !earthmap 34.0522 -118.2437 2024-07-20
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
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. Earth Map command will likely hit rate limits or fail.");
            return;
        }

        if (args.length < 2) {
            return await sock.sendMessage(chatId, {
                text: `🗺️ *Usage Error*\n\nPlease provide latitude and longitude. Examples:\n` +
                      `\`${context.commandPrefix}earthmap 34.0522 -118.2437\` (Los Angeles)\n` +
                      `\`${context.commandPrefix}earthmap 51.5074 0.1278 2024-07-20\` (London on a specific date)`
            }, { quoted: message });
        }

        const lat = parseFloat(args[0]);
        const lon = parseFloat(args[1]);

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return await sock.sendMessage(chatId, {
                text: `🗺️ *Invalid Coordinates*\n\nLatitude must be between -90 and 90. Longitude must be between -180 and 180. Examples:\n` +
                      `\`${context.commandPrefix}earthmap 34.0522 -118.2437\` (Los Angeles)\n` +
                      `\`${context.commandPrefix}earthmap 51.5074 0.1278 2024-07-20\` (London on a specific date)`
            }, { quoted: message });
        }

        let targetDate;
        if (args.length > 2) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(args[2])) {
                return await sock.sendMessage(chatId, {
                    text: `🗓️ *Invalid Date Format*\n\nPlease provide the date in YYYY-MM-DD format. Example: \`${context.commandPrefix}earthmap 34.0522 -118.2437 2024-07-20\``
                }, { quoted: message });
            }
            targetDate = args[2];
        } else {
            // Default to today's date, but imagery might have a delay
            targetDate = format(subDays(new Date(), 1), 'yyyy-MM-dd'); // Try yesterday first for more reliable results
        }

        await sock.sendMessage(chatId, { text: `🗺️ Fetching satellite image for Lat: ${lat}, Lon: ${lon} on ${targetDate}...` }, { quoted: message });
        logger.info(`Fetching Earth image for Lat: ${lat}, Lon: ${lon}, Date: ${targetDate} by ${context.senderJid}`);

        try {
            const assetsApiUrl = `https://api.Nasa.gov/planetary/earth/assets?lon=${lon}&lat=${lat}&date=${targetDate}&dim=0.25&api_key=${NasaApiKey}`;
            const assetsResponse = await axios.get(assetsApiUrl);
            let assetData = assetsResponse.data;

            // If no direct asset for the target date, try a few days back
            let foundImage = false;
            let currentDate = new Date(targetDate);
            const maxDaysBack = 7; // Try up to 7 days back

            if (assetData && assetData.url) {
                foundImage = true;
            } else {
                for (let i = 0; i < maxDaysBack; i++) {
                    currentDate = subDays(currentDate, 1);
                    const historicalDate = format(currentDate, 'yyyy-MM-dd');
                    const historicalAssetsApiUrl = `https://api.Nasa.gov/planetary/earth/assets?lon=${lon}&lat=${lat}&date=${historicalDate}&dim=0.25&api_key=${NasaApiKey}`;
                    const historicalResponse = await axios.get(historicalAssetsApiUrl);
                    if (historicalResponse.data && historicalResponse.data.url) {
                        assetData = historicalResponse.data; // Update assetData with found image
                        foundImage = true;
                        break;
                    }
                }
            }

            if (!foundImage || !assetData.url) {
                await sock.sendMessage(chatId, { text: `🤷‍♀️ No satellite image found for Lat: ${lat}, Lon: ${lon} on ${targetDate} or in the past ${maxDaysBack} days. Imagery might not be available for this location/date.` }, { quoted: message });
                logger.info(`No Earth image found for Lat: ${lat}, Lon: ${lon}, Date: ${targetDate} or recent past.`);
                return;
            }

            const imageUrl = assetData.url;
            const imageDate = assetData.date ? format(new Date(assetData.date), 'yyyy-MM-dd HH:mm UTC') : 'N/A';

            const caption = `*Satellite Image of Earth*\n\n` +
                            `📍 Coordinates: Lat ${lat}, Lon ${lon}\n` +
                            `🗓️ Date: ${imageDate}\n\n` +
                            `_Image from Nasa Earth API._`;

            await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: caption }, { quoted: message });
            logger.info(`Sent Earth image for Lat: ${lat}, Lon: ${lon}.`);

        } catch (error) {
            logger.error(`Error fetching Earth image for Lat: ${lat}, Lon: ${lon}, Date: ${targetDate}:`, error);
            let errorMessage = "❌ *Earth Image Fetch Failed*\n\nAn error occurred while fetching the satellite image.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.msg || error.response.data.error || 'Unknown API error'}.`;
                    if (error.response.status === 403 || error.response.status === 429) {
                        errorMessage += "\nThis might be due to an invalid API key or exceeding rate limits. Please check your `Nasa_API_KEY` in `.env`.";
                    } else if (error.response.status === 400) {
                        errorMessage += "\nCheck if coordinates are valid or if imagery is available for that date.";
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