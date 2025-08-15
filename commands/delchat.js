// src/commands/admin/delchat.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'delchat',
    aliases: ['deletechat'],
    description: 'Deletes the current chat or a specified chat from the bot\'s view. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the delchat command.
     * Usage: !delchat OR !delchat <user_number>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (isOwner).
     */
    async execute(sock, message, args, logger, context) {
        const commandChatId = message.key.remoteJid;
        const senderJid = context.senderJid;

        if (!context.isOwner) {
            return await sock.sendMessage(commandChatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }

        let targetJid;
        let displayTarget;

        if (args.length > 0) {
            // If a number is provided, delete that chat
            const targetNumber = args[0]?.replace(/\D/g, ''); // Remove non-digits
            if (!targetNumber || targetNumber.length < 7) {
                return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nPlease provide a valid user number to delete the chat. Example: \`${context.commandPrefix}delchat 254712345678\`` }, { quoted: message });
            }
            targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
            displayTarget = targetNumber;
        } else {
            // If no number is provided, delete the current chat
            targetJid = commandChatId;
            displayTarget = "this chat";
        }

        try {
            await sock.sendMessage(commandChatId, { text: `🗑️ Attempting to delete ${displayTarget}...` }, { quoted: message });

            // Fetch a small history to get the latest message key for deletion
            const history = await sock.fetchMessageHistory(targetJid, 1); // Fetch 1 message
            const lastMsgInChat = history?.messages?.[0];

            if (!lastMsgInChat || !lastMsgInChat.key) {
                // This can happen if the chat is completely empty or history isn't available
                return await sock.sendMessage(commandChatId, { text: `⚠️ *Deletion Failed*\n\nCould not find a message in ${displayTarget} to delete. The chat might be empty or not synced.` }, { quoted: message });
            }

            await sock.chatModify({
                delete: true,
                lastMessages: [
                    {
                        key: lastMsgInChat.key,
                        messageTimestamp: lastMsgInChat.messageTimestamp
                    }
                ]
            }, targetJid);

            await sock.sendMessage(commandChatId, { text: `✅ *Success!* ${displayTarget} has been deleted.` }, { quoted: message });
            logger.info(`Chat ${targetJid} deleted by owner ${senderJid}.`);

        } catch (error) {
            logger.error(`Error deleting chat ${targetJid}:`, error);
            await sock.sendMessage(commandChatId, { text: '❌ *Deletion Error*\n\nAn error occurred while trying to delete the chat. Please try again.' }, { quoted: message });
        }
    },
};