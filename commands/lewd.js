// src/commands/nsfw/lewd.js

export default {
    name: 'lewd',
    aliases: [],
    description: 'Sends another random NSFW image. (Premium, Private Only)',
    isPremium: true,
    groupOnly: false, // Changed to false
    privateOnly: true, // Changed to true
    adminOnly: false,
    category: 'Nsfw',

    /**
     * Executes the lewd command.
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
            // Fetch a random NSFW image from Waifu.im (using another combination of NSFW tags)
            const nsfwTags = ['ass', 'hentai', 'oral', 'paizuri']; // A subset for variety
            const randomTag = nsfwTags[Math.floor(Math.random() * nsfwTags.length)];

            const response = await fetch(`https://api.waifu.im/search?included_tags=${randomTag}`);
            const data = await response.json();
            const imageUrl = data.images[0]?.url;

            if (!imageUrl) {
                logger.warn(`Waifu.im Lewd API returned no image URL for ${chatId} with tag ${randomTag}`);
                return await sock.sendMessage(chatId, { text: '❌ *ACEPHAR NSFW Error*\n\nCould not fetch a lewd image. Please try again later.' }, { quoted: message });
            }

            await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: '😈 Your exclusive ACEPHAR lewd! 😈\n\n_Powered by Ernest Tech House_'
            }, { quoted: message });
            logger.info(`Sent lewd image to ${chatId} (tag: ${randomTag})`);

        } catch (error) {
            logger.error(`Error in lewd command for ${chatId}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *ACEPHAR System Error*\n\nFailed to fetch lewd image due to an internal error.' }, { quoted: message });
        }
    },
};