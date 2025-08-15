// src/commands/Nasa/epic.js
import axios from 'axios';
import { format, subDays } from 'date-fns'; // For date manipulation

export default {
    name: 'epic',
    aliases: ['earthpic', 'earthimage'],
    description: 'Fetches the latest full-disk image of Earth from Nasa\'s EPIC camera. Usage: !epic [YYYY-MM-DD]',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the EPIC command.
     * Usage: !epic [YYYY-MM-DD]
     * Example: !epic
     * Example: !epic 2024-07-25
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
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. EPIC command will likely hit rate limits or fail.");
            return;
        }

        let targetDate;
        if (args.length > 0) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(args[0])) {
                return await sock.sendMessage(chatId, {
                    text: `🗓️ *Invalid Date Format*\n\nPlease provide the date in YYYY-MM-DD format. Example: \`${context.commandPrefix}epic 2024-07-25\``
                }, { quoted: message });
            }
            targetDate = args[0];
        } else {
            // Default to today, but EPIC images are usually available with a 1-2 day delay
            targetDate = format(new Date(), 'yyyy-MM-dd');
        }

        await sock.sendMessage(chatId, { text: `🌍 Fetching Earth image from EPIC camera for ${targetDate}...` }, { quoted: message });
        logger.info(`Fetching EPIC image for date: ${targetDate} by ${context.senderJid}`);

        try {
            // First, get the list of available dates (or images for a specific date)
            const datesApiUrl = `https://api.Nasa.gov/EPIC/api/natural/all?api_key=${NasaApiKey}`;
            const datesResponse = await axios.get(datesApiUrl);
            const availableDates = datesResponse.data;

            if (!availableDates || availableDates.length === 0) {
                await sock.sendMessage(chatId, { text: "🤷‍♀️ Could not find any available EPIC image dates. Please try again later." }, { quoted: message });
                logger.warn("EPIC API returned no available dates.");
                return;
            }

            let imageDate = targetDate;
            let foundImage = false;
            let retries = 0;
            const maxRetries = 5; // Try previous days if targetDate has no images yet

            while (!foundImage && retries < maxRetries) {
                const imagesForDateUrl = `https://api.Nasa.gov/EPIC/api/natural/date/${imageDate}?api_key=${NasaApiKey}`;
                const imagesResponse = await axios.get(imagesForDateUrl);
                const imagesData = imagesResponse.data;

                if (imagesData && imagesData.length > 0) {
                    const latestImage = imagesData[0]; // Take the first image for that date
                    const imageFileName = latestImage.image;
                    const year = imageDate.substring(0, 4);
                    const month = imageDate.substring(5, 7);
                    const day = imageDate.substring(8, 10);

                    const imageUrl = `https://epic.gsfc.Nasa.gov/archive/natural/${year}/${month}/${day}/png/${imageFileName}.png`;

                    const caption = `*Earth from EPIC Camera - ${latestImage.caption || 'No caption'}*\n\n` +
                                    `🗓️ Date: ${imageDate}\n` +
                                    `⏰ Time: ${format(new Date(latestImage.date), 'HH:mm:ss')} UTC\n` +
                                    `☀️ Sun Position: Lat ${latestImage.dscovr_j2000_position.x.toFixed(2)}, Lon ${latestImage.dscovr_j2000_position.y.toFixed(2)}, Z ${latestImage.dscovr_j2000_position.z.toFixed(2)}\n` +
                                    `🌐 Earth Position: Lat ${latestImage.centroid_coordinates.lat.toFixed(2)}, Lon ${latestImage.centroid_coordinates.lon.toFixed(2)}`;

                    await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: caption }, { quoted: message });
                    logger.info(`Sent EPIC image for ${imageDate}.`);
                    foundImage = true;
                } else {
                    logger.debug(`No EPIC images for ${imageDate}. Trying previous day.`);
                    imageDate = format(subDays(new Date(imageDate), 1), 'yyyy-MM-dd');
                    retries++;
                }
            }

            if (!foundImage) {
                await sock.sendMessage(chatId, { text: `🤷‍♀️ Could not find an EPIC image for ${targetDate} or the preceding ${maxRetries} days. Images are usually available with a 1-2 day delay. Please try a slightly older date or check again later.` }, { quoted: message });
            }


        } catch (error) {
            logger.error(`Error fetching EPIC image for ${targetDate}:`, error);
            let errorMessage = "❌ *EPIC Fetch Failed*\n\nAn error occurred while fetching the Earth image.";
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