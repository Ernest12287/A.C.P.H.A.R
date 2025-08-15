// src/commands/nsfw/neko.js

export default {
    name: 'neko',
    aliases: ['catgirl'],
    description: 'Sends a random NSFW neko (catgirl) image. (Free, Private Only)',
    isPremium: false,
    groupOnly: false, // Changed to false
    privateOnly: true, // Changed to true
    adminOnly: false,
    category: 'Nsfw',

    /**
     * Executes the neko command.
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
            // Fetch a random NSFW neko image from Nekos.Life
            const response = await fetch('https://nekos.life/api/v2/img/neko');
            const data = await response.json();
            const imageUrl = data.url;

            if (!imageUrl) {
                logger.warn(`Neko API returned no image URL for ${chatId}`);
                return await sock.sendMessage(chatId, { text: '❌ *ACEPHAR NSFW Error*\n\nCould not fetch a neko image. Please try again later.' }, { quoted: message });
            }

            await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: '🐾 Your premium ACEPHAR neko! 🐾\n\n_Powered by Ernest Tech House_'
            }, { quoted: message });
            logger.info(`Sent neko image to ${chatId}`);

        } catch (error) {
            logger.error(`Error in neko command for ${chatId}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *ACEPHAR System Error*\n\nFailed to fetch neko image due to an internal error.' }, { quoted: message });
        }
    },
};