// src/commands/pin.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'pin',
    aliases: [],
    description: 'Pins the current chat or a specified chat to the top of the chat list. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    ownerOnly: true, // Now using ownerOnly for handler-based checks
    category: 'Admin',

    async execute(sock, message, args, logger, context) {
        const commandChatId = message.key.remoteJid;
        const senderJid = context.senderJid;
        const prefix = context.commandPrefix;

        let targetJid;
        let displayTarget;

        if (args.length > 0) {
            const targetNumber = args[0]?.replace(/\D/g, '');
            if (!targetNumber || targetNumber.length < 7) {
                return await sock.sendMessage(commandChatId, { text: `❌ *Usage Error*\n\nPlease provide a valid user number to pin. Example: \`${prefix}pin 254712345678\`` }, { quoted: message });
            }
            targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
            displayTarget = `the chat with ${targetNumber}`;
        } else {
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