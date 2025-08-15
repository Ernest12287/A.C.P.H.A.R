// src/commands/utility/chat.js
export default {
    name: 'chat',
    aliases: ['dm', 'pm'],
    description: '💬 Sends a direct message to a specific number. Usage: !chat <number> <message>',
    isPremium: false,
    groupOnly: false,
    privateOnly: true, // This is a sensitive command, best to keep it private only
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the chat command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;

        if (args.length < 2) {
            return await sock.sendMessage(chatId, {
                text: `❌ *Usage Error*\n\nPlease provide a number and a message. Example: \`${context.commandPrefix}chat 254793859108 Hello there!\``
            }, { quoted: message });
        }

        const recipientNumber = args[0];
        const textToSend = args.slice(1).join(' ').trim();

        // Basic number validation and formatting
        const formattedNumber = recipientNumber.replace(/[^0-9]/g, '');
        if (!formattedNumber) {
            return await sock.sendMessage(chatId, {
                text: "❌ *Invalid Number*\n\nThe number provided is not valid. Please provide a valid number without the '+' sign."
            }, { quoted: message });
        }

        const recipientJid = `${formattedNumber}@s.whatsapp.net`;

        await sock.sendMessage(chatId, { text: `✅ Sending message to ${recipientNumber}...` }, { quoted: message });
        logger.info(`User ${chatId} sending direct message to ${recipientNumber}.`);

        try {
            await sock.sendMessage(recipientJid, { text: textToSend });
            await sock.sendMessage(chatId, { text: `🎉 *Message Sent*\n\nSuccessfully sent your message to ${recipientNumber}.` }, { quoted: message });
            logger.info(`Direct message successfully sent to ${recipientNumber}.`);
        } catch (error) {
            logger.error(`Failed to send message to ${recipientNumber}:`, error);
            await sock.sendMessage(chatId, {
                text: `❌ *Message Failed*\n\nCould not send the message to ${recipientNumber}. The number might be incorrect or not registered on WhatsApp.`
            }, { quoted: message });
        }
    }
};