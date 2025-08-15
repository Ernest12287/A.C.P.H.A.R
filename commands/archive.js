// src/commands/admin/archive.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'archive',
    aliases: ['arch'],
    description: 'Archives the current chat or a specified chat. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the archive command.
     * Usage: !archive OR !archive <user_number>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (isOwner).
     */
    async execute(sock, message, args, logger, context) {
        const commandChatId = message.key.remoteJid; // The chat where the command was sent
        const senderJid = context.senderJid;

        if (!context.isOwner) {
            return await sock.sendMessage(commandChatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }

        let targetJid;
        let displayTarget;

        if (args.length > 0) {
            // If a number is provided, archive that chat
            const targetNumber = args[0]?.replace(/\D/g, ''); // Remove non-digits
            if (!targetNumber || targetNumber.length < 7) {
                return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nPlease provide a valid user number to archive. Example: \`${context.commandPrefix}archive 254712345678\`` }, { quoted: message });
            }
            targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
            displayTarget = targetNumber;
        } else {
            // If no number is provided, archive the current chat
            targetJid = commandChatId;
            displayTarget = "this chat";
        }

        try {
            await sock.sendMessage(commandChatId, { text: `📦 Attempting to archive ${displayTarget}...` }, { quoted: message });

            // --- Implement getLastMessageInChat ---
            // Fetch a small history to get the latest message key
            // Note: This might not always get the *absolute* last message if history is very long
            // and not synced, but it's the most practical way without full message storage.
            const history = await sock.fetchMessageHistory(targetJid, 1); // Fetch 1 message
            const lastMsgInChat = history?.messages?.[0]; // Get the most recent message

            if (!lastMsgInChat || !lastMsgInChat.key) {
                // This can happen if the chat is completely empty or history isn't available
                return await sock.sendMessage(commandChatId, { text: `⚠️ *Archive Failed*\n\nCould not find a message in ${displayTarget} to archive. The chat might be empty or not synced.` }, { quoted: message });
            }
            // --- End getLastMessageInChat ---

            await sock.chatModify({
                archive: true,
                lastMessages: [
                    {
                        key: lastMsgInChat.key,
                        messageTimestamp: lastMsgInChat.messageTimestamp
                    }
                ]
            }, targetJid);

            await sock.sendMessage(commandChatId, { text: `✅ *Success!* ${displayTarget} has been archived.` }, { quoted: message });
            logger.info(`Chat ${targetJid} archived by owner ${senderJid}.`);

        } catch (error) {
            logger.error(`Error archiving chat ${targetJid}:`, error);
            await sock.sendMessage(commandChatId, { text: '❌ *Archive Error*\n\nAn error occurred while trying to archive the chat. Please try again.' }, { quoted: message });
        }
    },
};