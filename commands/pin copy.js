// src/commands/admin/pin.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'pin',
    aliases: [],
    description: 'Pins the current chat or a specified chat to the top of the chat list. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the pin command.
     * Usage: !pin OR !pin <user_number>
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
            // If a number is provided, pin that chat
            const targetNumber = args[0]?.replace(/\D/g, ''); // Remove non-digits
            if (!targetNumber || targetNumber.length < 7) {
                return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nPlease provide a valid user number to pin. Example: \`${context.commandPrefix}pin 254712345678\`` }, { quoted: message });
            }
            targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
            displayTarget = targetNumber;
        } else {
            // If no number is provided, pin the current chat
            targetJid = commandChatId;
            displayTarget = "this chat";
        }

        try {
            await sock.sendMessage(commandChatId, { text: `📌 Attempting to pin ${displayTarget}...` }, { quoted: message });

            await sock.chatModify({
                pin: true
            }, targetJid);

            await sock.sendMessage(commandChatId, { text: `✅ *Success!* ${displayTarget} has been pinned.` }, { quoted: message });
            logger.info(`Chat ${targetJid} pinned by owner ${senderJid}.`);

        } catch (error) {
            logger.error(`Error pinning chat ${targetJid}:`, error);
            await sock.sendMessage(commandChatId, { text: '❌ *Pin Error*\n\nAn error occurred while trying to pin the chat. Please try again.' }, { quoted: message });
        }
    },
};