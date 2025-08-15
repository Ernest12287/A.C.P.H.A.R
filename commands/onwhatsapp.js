// src/commands/utility/onwhatsapp.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'onwhatsapp',
    aliases: ['checkwa', 'iswa'],
    description: 'Checks if a given number is registered on WhatsApp. Usage: !onwhatsapp <number>',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the onwhatsapp command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const targetNumber = args[0]?.replace(/\D/g, ''); // Remove non-digits

        if (!targetNumber || targetNumber.length < 7) { // Basic number length validation
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a valid phone number (e.g., \`${context.commandPrefix}onwhatsapp 254712345678\`).` }, { quoted: message });
        }

        const targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);

        try {
            await sock.sendMessage(chatId, { text: `🔎 Checking if \`${targetNumber}\` is on WhatsApp...` }, { quoted: message });
            const [result] = await sock.onWhatsApp(targetJid);

            if (result && result.exists) {
                await sock.sendMessage(chatId, { text: `✅ *Result:* \`${targetNumber}\` *is on WhatsApp!* JID: \`${result.jid}\`` }, { quoted: message });
                logger.info(`${targetNumber} exists on WhatsApp.`);
            } else {
                await sock.sendMessage(chatId, { text: `❌ *Result:* \`${targetNumber}\` is *NOT* on WhatsApp.` }, { quoted: message });
                logger.info(`${targetNumber} does not exist on WhatsApp.`);
            }
        } catch (error) {
            logger.error(`Error checking WhatsApp presence for ${targetNumber}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *Error*\n\nAn error occurred while checking WhatsApp presence. Please try again.' }, { quoted: message });
        }
    },
};