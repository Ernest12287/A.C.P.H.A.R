// src/commands/nsfw/waifu.js

export default {
    name: 'waifu',
    aliases: ['animegirl'],
    description: 'Sends a random NSFW waifu image. (Free, Private Only)',
    isPremium: false,
    groupOnly: false, // Changed to false
    privateOnly: true, // Changed to true
    adminOnly: false,
    category: 'Nsfw',

    /**
     * Executes the waifu command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;

        // --- NSFW Policy Check ---
        if (context.isGroup) {
            return await sock.sendMessage(chatId, {
                text: "❌ *ACEPHAR NSFW Policy*\n\nNSFW commands are only available in *private chats* with the bot for privacy and safety reasons. Please use this command in my DM."
            }, { quoted: message });
        }
        // --- End NSFW Policy Check ---

        try {
            // Fetch a random NSFW waifu image from Waifu.im
            const response = await fetch('https://api.waifu.im/search?included_tags=waifu&is_nsfw=true');
            const data = await response.json();
            const imageUrl = data.images[0]?.url; // Waifu.im returns an array of images

            if (!imageUrl) {
                logger.warn(`Waifu.im API returned no image URL for ${chatId}`);
                return await sock.sendMessage(chatId, { text: '❌ *ACEPHAR NSFW Error*\n\nCould not fetch a waifu image. Please try again later.' }, { quoted: message });
            }

            await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: '✨ Your ACEPHAR waifu! ✨\n\n_Powered by Ernest Tech House_'
            }, { quoted: message });
            logger.info(`Sent waifu image to ${chatId}`);

        } catch (error) {
            logger.error(`Error in waifu command for ${chatId}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *ACEPHAR System Error*\n\nFailed to fetch waifu image due to an internal error.' }, { quoted: message });
        }
    },
};