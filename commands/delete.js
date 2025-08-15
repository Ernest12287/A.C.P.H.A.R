// src/commands/utility/delete.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg; // Included for consistency, though not directly used in this command's current logic

export default {
    name: 'delete',
    aliases: ['del'],
    description: 'Deletes a message. Works best for messages sent by the bot itself, or if the bot is a group admin (by replying to the message).',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false, // Available to all users, but actual deletion power is limited
    category: 'Utility',

    /**
     * Executes the delete command.
     * Usage: !delete (reply to a message) OR !delete <message_id>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        let targetMessageKey = null;

        // Option 1: User replied to a message
        const quotedMessageContextInfo = message.message?.extendedTextMessage?.contextInfo;
        if (quotedMessageContextInfo && quotedMessageContextInfo.stanzaId) {
            targetMessageKey = {
                remoteJid: chatId, // The chat where the message exists
                id: quotedMessageContextInfo.stanzaId, // The ID of the message to delete
                fromMe: quotedMessageContextInfo.quotedMessage?.key?.fromMe || false, // Was the quoted message sent by the bot?
                participant: quotedMessageContextInfo.participant // Sender of the quoted message (important for groups)
            };
            logger.debug(`Delete command: Target message key from reply: ${JSON.stringify(targetMessageKey)}`);
        }
        // Option 2: Message ID provided as an argument (primarily for bot's own messages)
        else if (args[0]) {
            targetMessageKey = {
                remoteJid: chatId,
                id: args[0],
                // When an ID is provided directly, we assume it's for a message the bot sent
                // or has direct control over. Setting fromMe to true here often helps Baileys
                // understand it's a message the bot "owns" for deletion purposes.
                fromMe: true
            };
            logger.debug(`Delete command: Target message key from argument: ${JSON.stringify(targetMessageKey)}`);
        }

        if (!targetMessageKey) {
            return await sock.sendMessage(chatId, {
                text: `❌ *Usage Error*\n\nPlease reply to the message you want to delete, or provide its ID.
Example (reply): \`${context.commandPrefix}delete\`
Example (by ID - for bot's own messages): \`${context.commandPrefix}delete <message_id>\``
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: '🗑️ Attempting to delete message...' }, { quoted: message });
            await sock.sendMessage(chatId, { delete: targetMessageKey });
            logger.info(`Attempted to delete message with ID ${targetMessageKey.id} in ${chatId}.`);
            // WhatsApp doesn't send an explicit success for deletion for everyone.
            // The message will just disappear if successful.
        } catch (error) {
            logger.error(`Error deleting message with ID ${targetMessageKey.id}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *Deletion Failed*\n\nCould not delete the message. This usually happens if:\n- The message is too old (WhatsApp has a time limit for "delete for everyone").\n- The bot did not send the message, and is not an admin in a group chat.\n- The message ID is incorrect or the message does not exist.' }, { quoted: message });
        }
    },
};