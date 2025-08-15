// src/commands/admin/unblock.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'unblock',
    aliases: [],
    description: 'Unblocks a user, allowing them to interact with the bot again. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the unblock command.
     * Usage: !unblock <user_number>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (isOwner).
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;

        if (!context.isOwner) {
            return await sock.sendMessage(chatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }

        const targetNumber = args[0]?.replace(/\D/g, ''); // Remove non-digits
        if (!targetNumber) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a user number to unblock. Example: \`${context.commandPrefix}unblock 254712345678\`` }, { quoted: message });
        }

        const targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);

        try {
            await sock.sendMessage(chatId, { text: `🔓 Attempting to unblock user \`${targetNumber}\`...` }, { quoted: message });
            await sock.updateBlockStatus(targetJid, 'unblock');
            await sock.sendMessage(chatId, { text: `✅ *Success!* User \`${targetNumber}\` has been unblocked.` }, { quoted: message });
            logger.info(`User ${targetJid} unblocked by owner.`);
        } catch (error) {
            logger.error(`Error unblocking user ${targetJid}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *Unblock Error*\n\nAn error occurred while trying to unblock the user. They might not be blocked, or the number is incorrect.' }, { quoted: message });
        }
    },
};