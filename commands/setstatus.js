// src/commands/admin/setstatus.js

export default {
    name: 'setstatus',
    aliases: ['botstatus'],
    description: 'Changes the bot\'s WhatsApp "About" status. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: true, // Best used in private chat
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the setstatus command.
     * Usage: !setstatus <new_status_text>
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

        const newStatus = args.join(' ').trim();
        if (!newStatus) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide the new status text. Example: \`${context.commandPrefix}setstatus I am ACEPHAR Bot!\`` }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: `🔄 Setting bot status to: "${newStatus}"...` }, { quoted: message });
            await sock.updateProfileStatus(newStatus);
            await sock.sendMessage(chatId, { text: `✅ *Success!* Bot status has been updated to: "${newStatus}"` }, { quoted: message });
            logger.info(`Bot status updated to: "${newStatus}" by owner.`);
        } catch (error) {
            logger.error(`Error setting bot status to "${newStatus}":`, error);
            await sock.sendMessage(chatId, { text: '❌ *Error*\n\nAn error occurred while updating the bot\'s status. Please try again.' }, { quoted: message });
        }
    },
};