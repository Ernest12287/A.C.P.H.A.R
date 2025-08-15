// src/commands/admin/setbotname.js

export default {
    name: 'setbotname',
    aliases: ['botname'],
    description: 'Changes the bot\'s WhatsApp profile name. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: true, // Best used in private chat
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the setbotname command.
     * Usage: !setbotname <new_name>
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

        const newName = args.join(' ').trim();
        if (!newName) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide the new name for the bot. Example: \`${context.commandPrefix}setbotname ACEPHAR Pro\`` }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: `🔄 Setting bot name to: "${newName}"...` }, { quoted: message });
            await sock.updateProfileName(newName);
            await sock.sendMessage(chatId, { text: `✅ *Success!* Bot name has been updated to: "${newName}"` }, { quoted: message });
            logger.info(`Bot name updated to: "${newName}" by owner.`);
        } catch (error) {
            logger.error(`Error setting bot name to "${newName}":`, error);
            await sock.sendMessage(chatId, { text: '❌ *Error*\n\nAn error occurred while updating the bot\'s name. Please try again.' }, { quoted: message });
        }
    },
};