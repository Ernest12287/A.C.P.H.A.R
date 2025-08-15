// src/commands/admin/dison.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

// WhatsApp's standard ephemeral durations in seconds
const EPHEMERAL_DURATIONS = {
    '1': 24 * 60 * 60,   // 24 hours
    '7': 7 * 24 * 60 * 60, // 7 days
    '90': 90 * 24 * 60 * 60 // 90 days
};

export default {
    name: 'dison',
    aliases: ['disappearingon', 'dm_on'],
    description: 'Turns on disappearing messages for the current chat or a specified chat. Duration in days: 1, 7, or 90. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the dison command.
     * Usage: !dison <days> OR !dison <user_number> <days>
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
        let durationDays;

        if (args.length === 1) {
            // Case 1: !dison <days> (current chat)
            durationDays = args[0];
            targetJid = commandChatId;
            displayTarget = "this chat";
        } else if (args.length === 2) {
            // Case 2: !dison <user_number> <days>
            const targetNumber = args[0]?.replace(/\D/g, '');
            if (!targetNumber || targetNumber.length < 7) {
                return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nPlease provide a valid user number or duration. Example: \`${context.commandPrefix}dison 254712345678 7\` or \`${context.commandPrefix}dison 7\`` }, { quoted: message });
            }
            targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
            displayTarget = targetNumber;
            durationDays = args[1];
        } else {
            return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nInvalid arguments. Usage:\n\`${context.commandPrefix}dison <days>\` (for current chat)\n\`${context.commandPrefix}dison <user_number> <days>\`\n\nSupported durations: 1 (for 24 hours), 7 (days), 90 (days).` }, { quoted: message });
        }

        const ephemeralSeconds = EPHEMERAL_DURATIONS[durationDays];

        if (ephemeralSeconds === undefined) {
            return await sock.sendMessage(commandChatId, { text: `❌ *Invalid Duration*\n\nSupported durations for disappearing messages are: *1* (for 24 hours), *7* (days), or *90* (days).` }, { quoted: message });
        }

        try {
            await sock.sendMessage(commandChatId, { text: `⏳ Turning on disappearing messages for ${displayTarget} for ${durationDays} days...` }, { quoted: message });

            await sock.sendMessage(targetJid, { disappearingMessagesInChat: ephemeralSeconds });

            await sock.sendMessage(commandChatId, { text: `✅ *Success!* Disappearing messages turned on for ${displayTarget} for *${durationDays} days*.` }, { quoted: message });
            logger.info(`Disappearing messages set to ${durationDays} days for ${targetJid} by owner ${senderJid}.`);

        } catch (error) {
            logger.error(`Error turning on disappearing messages for ${targetJid}:`, error);
            await sock.sendMessage(commandChatId, { text: '❌ *Error*\n\nAn error occurred while trying to turn on disappearing messages. Please try again.' }, { quoted: message });
        }
    },
};