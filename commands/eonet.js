// src/commands/Nasa/eonet.js
import axios from 'axios';
import { format, subDays } from 'date-fns';

export default {
    name: 'eonet',
    aliases: ['earthevents', 'naturalevents'],
    description: '🌍 Fetches recent natural events (e.g., wildfires, storms) from Nasa\'s EONET. Usage: !eonet [category] [days_back]',
    isPremium: false, // This command is free
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the EONET command.
     * Usage: !eonet [category] [days_back]
     * Example: !eonet (for all categories, last 7 days)
     * Example: !eonet wildfires
     * Example: !eonet floods 30
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
            logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. EONET command will likely hit rate limits or fail.");
            return;
        }

        let category = 'all'; // Default to all categories
        let daysBack = 7; // Default to last 7 days

        if (args.length > 0) {
            const lastArg = args[args.length - 1];
            const parsedDays = parseInt(lastArg);

            if (!isNaN(parsedDays) && parsedDays > 0 && parsedDays <= 30) { // EONET usually supports up to 30 days
                daysBack = parsedDays;
                if (args.length > 1) {
                    category = args.slice(0, -1).join(' ').toLowerCase();
                }
            } else {
                category = args.join(' ').toLowerCase();
            }
        }

        const today = new Date();
        const startDate = format(subDays(today, daysBack), 'yyyy-MM-dd');
        const endDate = format(today, 'yyyy-MM-dd');

        await sock.sendMessage(chatId, { text: `🌍 Searching for natural events (category: ${category || 'all'}) in the last ${daysBack} days...` }, { quoted: message });
        logger.info(`Fetching EONET events (category: ${category || 'all'}) for last ${daysBack} days by ${context.senderJid}`);

        try {
            // EONET API endpoint
            let apiUrl = `https://eonet.gsfc.Nasa.gov/api/v3/events?status=open&start=${startDate}&end=${endDate}&api_key=${NasaApiKey}`;
            if (category && category !== 'all') {
                // First, get categories to find the ID
                const categoriesUrl = `https://eonet.gsfc.Nasa.gov/api/v3/categories?api_key=${NasaApiKey}`;
                const categoriesResponse = await axios.get(categoriesUrl);
                const categories = categoriesResponse.data.categories;
                const targetCategory = categories.find(cat => cat.title.toLowerCase() === category);

                if (targetCategory) {
                    apiUrl = `https://eonet.gsfc.Nasa.gov/api/v3/events?status=open&start=${startDate}&end=${endDate}&category=${targetCategory.id}&api_key=${NasaApiKey}`;
                } else {
                    await sock.sendMessage(chatId, { text: `🤷‍♀️ Category "${category}" not found. Available categories include: ${categories.map(c => c.title).join(', ')}.` }, { quoted: message });
                    logger.warn(`Invalid EONET category: ${category}`);
                    return;
                }
            }

            const response = await axios.get(apiUrl);
            const events = response.data.events;

            if (!events || events.length === 0) {
                await sock.sendMessage(chatId, { text: `✨ No natural events found for category "${category || 'all'}" in the last ${daysBack} days. All clear!` }, { quoted: message });
                logger.info(`No EONET events found for category "${category || 'all'}" in last ${daysBack} days.`);
                return;
            }

            let reply = `*Recent Natural Events (Last ${daysBack} Days)*\nCategory: ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
            let count = 0;

            for (const event of events) {
                if (count >= 5) { // Limit to top 5 for brevity
                    reply += `\n_...and ${events.length - count} more._`;
                    break;
                }

                const eventCategory = event.categories && event.categories.length > 0 ? event.categories[0].title : 'N/A';
                const eventDate = event.geometries && event.geometries.length > 0 ? format(new Date(event.geometries[0].date), 'yyyy-MM-dd HH:mm UTC') : 'N/A';
                const eventLink = event.sources && event.sources.length > 0 ? event.sources[0].url : 'N/A';

                reply += `*${event.title || 'Untitled Event'}*\n`;
                reply += `  - *Category:* ${eventCategory}\n`;
                reply += `  - *Date:* ${eventDate}\n`;
                if (event.geometries && event.geometries.length > 0 && event.geometries[0].coordinates) {
                    reply += `  - *Coordinates:* Lon ${event.geometries[0].coordinates[0]}, Lat ${event.geometries[0].coordinates[1]}\n`;
                }
                reply += `  - *Link:* ${eventLink}\n\n`;
                count++;
            }

            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            logger.info(`Sent EONET event info.`);

        } catch (error) {
            logger.error(`Error fetching EONET events:`, error);
            let errorMessage = "❌ *EONET Fetch Failed*\n\nAn error occurred while fetching natural event data.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.message || error.response.data.error || 'Unknown API error'}.`;
                    if (error.response.status === 403 || error.response.status === 429) {
                        errorMessage += "\nThis might be due to an invalid API key or exceeding rate limits. Please check your `Nasa_API_KEY` in `.env`.";
                    } else if (error.response.status === 400) {
                        errorMessage += "\nCheck if the date range is valid (max 30 days) or category exists.";
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