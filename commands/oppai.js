// src/commands/nsfw/oppai.js

export default {
    name: 'oppai',
    aliases: ['boobs'],
    description: 'Sends a random NSFW oppai image. (Premium, Private Only)',
    isPremium: true,
    groupOnly: false, // Changed to false
    privateOnly: true, // Changed to true
    adminOnly: false,
    category: 'Nsfw',

    /**
     * Executes the oppai command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, { isPremiumUser, isGroup }) {
        const chatId = message.key.remoteJid;

        // --- NSFW Policy Check ---
        if (isGroup) {
            return await sock.sendMessage(chatId, {
                text: "❌ *ACEPHAR NSFW Policy*\n\nNSFW commands are only available in *private chats* with the bot for privacy and safety reasons. Please use this command in my DM."
            }, { quoted: message });
        }
        // --- End NSFW Policy Check ---

        if (!isPremiumUser) {
            return await sock.sendMessage(chatId, {
                text: "🔒 *ACEPHAR Premium Feature*\n\nThis command is exclusive to *Premium Subscribers*.\nUpgrade your ACEPHAR experience for full access!\n\n_Contact Ernest Tech House for subscription details._"
            }, { quoted: message });
        }

        try {
            const response = await fetch('https://api.waifu.im/search?included_tags=oppai&is_nsfw=true');
            const data = await response.json();
            const imageUrl = data.images[0]?.url;

            if (!imageUrl) {
                logger.warn(`Waifu.im Oppai API returned no image URL for ${chatId}`);
                return await sock.sendMessage(chatId, { text: '❌ *ACEPHAR NSFW Error*\n\nCould not fetch an oppai image. Please try again later.' }, { quoted: message });
            }

            await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: '🍈 Your exclusive ACEPHAR oppai! 🍈\n\n_Powered by Ernest Tech House_'
            }, { quoted: message });
            logger.info(`Sent oppai image to ${chatId}`);

        } catch (error) {
            logger.error(`Error in oppai command for ${chatId}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *ACEPHAR System Error*\n\nFailed to fetch oppai image due to an internal error.' }, { quoted: message });
        }
    },
};