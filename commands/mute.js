// src/commands/admin/mute.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'mute',
    aliases: [],
    description: 'Mutes the current chat or a specified chat for a given duration in minutes. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the mute command.
     * Usage: !mute <minutes> OR !mute <user_number> <minutes>
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
        let muteDurationMinutes;

        if (args.length === 1) {
            // Case 1: !mute <minutes> (current chat)
            muteDurationMinutes = parseInt(args[0]);
            targetJid = commandChatId;
            displayTarget = "this chat";
        } else if (args.length === 2) {
            // Case 2: !mute <number> <minutes>
            const targetNumber = args[0]?.replace(/\D/g, '');
            if (!targetNumber || targetNumber.length < 7) {
                return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nPlease provide a valid user number or mute duration. Example: \`${context.commandPrefix}mute 254712345678 20\` or \`${context.commandPrefix}mute 20\`` }, { quoted: message });
            }
            targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
            displayTarget = targetNumber;
            muteDurationMinutes = parseInt(args[1]);
        } else {
            return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nInvalid arguments. Usage:\n\`${context.commandPrefix}mute <minutes>\` (for current chat)\n\`${context.commandPrefix}mute <user_number> <minutes>\`` }, { quoted: message });
        }

        if (isNaN(muteDurationMinutes) || muteDurationMinutes <= 0) {
            return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nPlease provide a valid positive number of minutes to mute.` }, { quoted: message });
        }

        const muteDurationMs = muteDurationMinutes * 60 * 1000; // Convert minutes to milliseconds

        try {
            await sock.sendMessage(commandChatId, { text: `🔇 Attempting to mute ${displayTarget} for ${muteDurationMinutes} minutes...` }, { quoted: message });

            await sock.chatModify({
                mute: muteDurationMs
            }, targetJid);

            await sock.sendMessage(commandChatId, { text: `✅ *Success!* ${displayTarget} has been muted for ${muteDurationMinutes} minutes.` }, { quoted: message });
            logger.info(`Chat ${targetJid} muted for ${muteDurationMinutes} minutes by owner ${senderJid}.`);

        } catch (error) {
            logger.error(`Error muting chat ${targetJid}:`, error);
            await sock.sendMessage(commandChatId, { text: '❌ *Mute Error*\n\nAn error occurred while trying to mute the chat. Please try again.' }, { quoted: message });
        }
    },
};