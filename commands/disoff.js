// src/commands/admin/disoff.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'disoff',
    aliases: ['disappearingoff', 'dm_off'],
    description: 'Turns off disappearing messages for the current chat or a specified chat. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the disoff command.
     * Usage: !disoff OR !disoff <user_number>
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
            // Case 1: !disoff (current chat)
            targetJid = commandChatId;
            displayTarget = "this chat";
        } else if (args.length === 1) {
            // Case 2: !disoff <number>
            const targetNumber = args[0]?.replace(/\D/g, '');
            if (!targetNumber || targetNumber.length < 7) {
                return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nPlease provide a valid user number. Example: \`${context.commandPrefix}disoff 254712345678\`` }, { quoted: message });
            }
            targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
            displayTarget = targetNumber;
        } else {
            return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nInvalid arguments. Usage:\n\`${context.commandPrefix}disoff\` (for current chat)\n\`${context.commandPrefix}disoff <user_number>\`` }, { quoted: message });
        }

        try {
            await sock.sendMessage(commandChatId, { text: `🚫 Turning off disappearing messages for ${displayTarget}...` }, { quoted: message });

            await sock.sendMessage(targetJid, { disappearingMessagesInChat: false }); // Set to false to turn off

            await sock.sendMessage(commandChatId, { text: `✅ *Success!* Disappearing messages turned off for ${displayTarget}.` }, { quoted: message });
            logger.info(`Disappearing messages turned off for ${targetJid} by owner ${senderJid}.`);

        } catch (error) {
            logger.error(`Error turning off disappearing messages for ${targetJid}:`, error);
            await sock.sendMessage(commandChatId, { text: '❌ *Error*\n\nAn error occurred while trying to turn off disappearing messages. Please try again.' }, { quoted: message });
        }
    },
};