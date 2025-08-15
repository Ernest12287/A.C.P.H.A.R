// src/commands/Nasa/marsphotos.js
import axios from 'axios';
import { format, subDays } from 'date-fns'; // For date manipulation

export default {
    name: 'marsphotos',
    aliases: ['mrphotos', 'marsrover'],
    description: 'Fetches recent photos from a specified Mars Rover (Curiosity, Opportunity, Spirit). Usage: !marsphotos <rover_name> [sol_day]',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Nasa',

    /**
     * Executes the Mars Photos command.
     * Usage: !marsphotos <rover_name> [sol_day]
     * Example: !marsphotos curiosity
     * Example: !marsphotos opportunity 1000
     * Example: !marsphotos spirit 500
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const NasaApiKey = process.env.Nasa_API_KEY;

        try {
            if (!NasaApiKey || NasaApiKey === 'DEMO_KEY') {
                await sock.sendMessage(chatId, {
                    text: "❌ *Nasa API Key Missing/Demo Key Used*\n\nPlease set your `Nasa_API_KEY` in the `.env` file with a valid key from `api.Nasa.gov` for full functionality and higher rate limits."
                }, { quoted: message });
                logger.warn("Nasa_API_KEY is missing or set to DEMO_KEY. Mars Photos command will likely hit rate limits or fail.");
                return;
            }

            if (args.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: `📸 *Usage Error*\n\nPlease specify a Mars Rover (Curiosity, Opportunity, or Spirit). Example: \`${context.commandPrefix}marsphotos curiosity\` or \`${context.commandPrefix}marsphotos opportunity 1000\``
                }, { quoted: message });
            }

            const roverName = args[0].toLowerCase();
            const validRovers = ['curiosity', 'opportunity', 'spirit'];

            if (!validRovers.includes(roverName)) {
                return await sock.sendMessage(chatId, {
                    text: `❌ *Invalid Rover Name*\n\nSupported rovers are: Curiosity, Opportunity, Spirit. Example: \`${context.commandPrefix}marsphotos curiosity\``
                }, { quoted: message });
            }

            let initialSolDay = 'latest'; // Default to latest photos
            if (args.length > 1) {
                const parsedSol = parseInt(args[1]);
                if (!isNaN(parsedSol) && parsedSol >= 0) {
                    initialSolDay = parsedSol;
                } else {
                    return await sock.sendMessage(chatId, {
                        text: `🔢 *Invalid Sol Day*\n\nSol day must be a non-negative number. Example: \`${context.commandPrefix}marsphotos curiosity 1000\``
                    }, { quoted: message });
                }
            }

            await sock.sendMessage(chatId, {
                text: `🚀 Searching for recent photos from the ${roverName.charAt(0).toUpperCase() + roverName.slice(1)} rover (Sol: ${initialSolDay})...`
            }, { quoted: message });

            logger.info(`Fetching Mars photos for rover: ${roverName}, initial sol: ${initialSolDay} by ${context.senderJid}`);

            let photosData = [];
            let currentSol = initialSolDay;
            const maxSolRetries = 5;

            for (let i = 0; i < maxSolRetries; i++) {
                try {
                    const apiUrl = `https://api.Nasa.gov/mars-photos/api/v1/rovers/${roverName}/photos?sol=${currentSol}&api_key=${NasaApiKey}`;
                    const response = await axios.get(apiUrl);
                    photosData = response.data.photos;

                    if (photosData && photosData.length > 0) {
                        logger.info(`Found photos for ${roverName} on Sol ${currentSol}.`);
                        break;
                    } else {
                        logger.debug(`No photos for ${roverName} on Sol ${currentSol}. Trying previous sol.`);

                        if (currentSol === 'latest') {
                            currentSol = 1000; // fallback sol
                        } else if (typeof currentSol === 'number' && currentSol > 0) {
                            currentSol--;
                        } else {
                            break;
                        }
                    }
                } catch (error) {
                    logger.error(`Error during Mars photos retry for ${roverName} (Sol: ${currentSol}):`, error);
                    if (axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 429)) {
                        throw error;
                    }
                    if (typeof currentSol === 'number' && currentSol > 0) {
                        currentSol--;
                    } else {
                        break;
                    }
                }
            }

            if (!photosData || photosData.length === 0) {
                await sock.sendMessage(chatId, {
                    text: `🤷‍♂️ No photos found for the ${roverName} rover on Sol ${initialSolDay} or in the preceding sols. It might not have taken photos recently, or the sol number is out of range.`
                }, { quoted: message });
                logger.info(`No Mars photos found for ${roverName} after retries.`);
                return;
            }

            const photosToSend = photosData.slice(0, Math.min(photosData.length, 3));
            logger.info(`Found ${photosData.length} photos, sending ${photosToSend.length}.`);

            for (const photo of photosToSend) {
                const caption = `📸 *Mars Photo by ${roverName.charAt(0).toUpperCase() + roverName.slice(1)} Rover*\n\n` +
                    `Camera: ${photo.camera.full_name} (${photo.camera.name})\n` +
                    `Sol: ${photo.sol}\n` +
                    `Earth Date: ${photo.earth_date}\n` +
                    `Status: ${photo.rover.status}`;
                await sock.sendMessage(chatId, {
                    image: { url: photo.img_src },
                    caption: caption
                }, { quoted: message });
            }

            if (photosData.length > 3) {
                await sock.sendMessage(chatId, {
                    text: `_Found ${photosData.length - 3} more photos for Sol ${currentSol}. Try a more specific sol day or browse Nasa's website for more._`
                }, { quoted: message });
            }

        } catch (error) {
            logger.error(`Error fetching Mars photos for ${args[0]} (Sol: ${args[1] || 'latest'}):`, error);
            let errorMessage = "❌ *Mars Photos Fetch Failed*\n\nAn error occurred while fetching Mars Rover photos.";
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage += `\nStatus: ${error.response.status}. Message: ${error.response.data.errors || error.response.data.msg || 'Unknown API error'}.`;
                    if (error.response.status === 400) {
                        errorMessage += "\nCheck if the rover name and sol day are valid.";
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
    }
};
