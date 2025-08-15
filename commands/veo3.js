// src/commands/tools/veo3.js
import { fal } from "@fal-ai/client"; // Import the official fal.ai client library

export default {
    name: 'veo3',
    aliases: ['aivideo', 'text2video'],
    description: 'Generates a short AI video from text using Google Veo 3 via fal.ai. (Requires API key)',
    isPremium: true, // This is a premium feature due to API costs
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Tools',

    /**
     * Executes the veo3 command.
     * Usage: !veo3 <your_video_description_prompt>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (video prompt).
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const prompt = args.join(' ').trim();
        const falApiKey = process.env.FAL_AI_API_KEY;

        if (!falApiKey) {
            return await sock.sendMessage(chatId, { text: '❌ *Configuration Error*\n\nFAL_AI_API_KEY is not set in .env. Cannot generate AI videos.' }, { quoted: message });
        }

        if (!prompt) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a detailed video description. Example: \`${context.commandPrefix}veo3 A serene mountain landscape at sunset with birds flying.\`` }, { quoted: message });
        }

        if (prompt.length < 20) {
            return await sock.sendMessage(chatId, { text: '❌ *Prompt Too Short*\n\nPlease provide a more detailed description (at least 20 characters) for better video generation.' }, { quoted: message });
        }

        // Check if user is premium (or owner)
        if (!context.isPremiumUser && !context.isOwner) {
            return await sock.sendMessage(chatId, {
                text: "🔒 *ACEPHAR Premium Feature*\n\nThis AI Video Generation command is exclusive to *Premium Subscribers*.\nUpgrade your ACEPHAR experience for full access!\n\n_Contact Ernest Tech House for subscription details._"
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: `🎬 Generating AI video for: "*${prompt}*"\n\n_This can take 1-5 minutes. Please be patient._` }, { quoted: message });

            // Initialize fal.ai client with API key
            fal.config({
                credentials: falApiKey,
            });

            // Submit the video generation request and subscribe to updates
            const result = await fal.subscribe("fal-ai/veo3/generate", {
                input: {
                    prompt: prompt,
                    duration_seconds: 8, // Standard Veo 3 video length
                    generate_audio: true, // Generate with audio
                    resolution: "720p" // You can try "1080p" if your fal.ai plan supports it
                },
                logs: true, // Enable logs to see progress in terminal
                onQueueUpdate: (update) => {
                    if (update.status === "IN_PROGRESS") {
                        // Log progress messages from fal.ai
                        update.logs.map((log) => log.message).forEach(logger.debug);
                    }
                },
            });

            if (result.error) {
                throw new Error(result.error.message || "Unknown error from fal.ai");
            }

            const videoUrl = result.data.video.url;

            if (videoUrl) {
                await sock.sendMessage(chatId, {
                    video: { url: videoUrl },
                    caption: `🎬 *AI Video Generated!* 🎬\n\n*Prompt:* "${prompt}"\n\n_Powered by Google Veo 3 via fal.ai_`
                }, { quoted: message });
                logger.info(`Veo3 video sent for "${prompt}" to ${chatId}.`);
            } else {
                await sock.sendMessage(chatId, { text: '❌ *Video Generation Failed*\n\nCould not retrieve the video URL from fal.ai. Please try a different prompt or try again later.' }, { quoted: message });
                logger.warn(`Veo3 job completed but no video URL found for prompt: "${prompt}"`);
            }

        } catch (error) {
            logger.error(`Error in !veo3 command for "${prompt}":`, error.message);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn error occurred during AI video generation. Please check your prompt or try again later. If the issue persists, verify your FAL_AI_API_KEY and fal.ai account status.' }, { quoted: message });
        }
    },
};