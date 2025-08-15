// src/commands/admin/unmute.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'unmute',
    aliases: [],
    description: 'Unmutes the current chat or a specified chat. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the unmute command.
     * Usage: !unmute OR !unmute <user_number>
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

        if (args.length === 0) {
            // Case 1: !unmute (current chat)
            targetJid = commandChatId;
            displayTarget = "this chat";
        } else if (args.length === 1) {
            // Case 2: !unmute <number>
            const targetNumber = args[0]?.replace(/\D/g, '');
            if (!targetNumber || targetNumber.length < 7) {
                return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nPlease provide a valid user number. Example: \`${context.commandPrefix}unmute 254712345678\`` }, { quoted: message });
            }
            targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
            displayTarget = targetNumber;
        } else {
            return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nInvalid arguments. Usage:\n\`${context.commandPrefix}unmute\` (for current chat)\n\`${context.commandPrefix}unmute <user_number>\`` }, { quoted: message });
        }

        try {
            await sock.sendMessage(commandChatId, { text: `🔊 Attempting to unmute ${displayTarget}...` }, { quoted: message });

            await sock.chatModify({
                mute: null // Set to null to unmute
            }, targetJid);

            await sock.sendMessage(commandChatId, { text: `✅ *Success!* ${displayTarget} has been unmuted.` }, { quoted: message });
            logger.info(`Chat ${targetJid} unmuted by owner ${senderJid}.`);

        } catch (error) {
            logger.error(`Error unmuting chat ${targetJid}:`, error);
            await sock.sendMessage(commandChatId, { text: '❌ *Unmute Error*\n\nAn error occurred while trying to unmute the chat. Please try again.' }, { quoted: message });
        }
    },
};