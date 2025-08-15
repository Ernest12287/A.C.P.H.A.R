// src/commands/channels/sendchannelmsg.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'sendchannelmsg',
    aliases: ['channelmsg', 'chmsg'],
    description: 'Sends a message to a WhatsApp channel. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Only bot owner can send messages to channels
    category: 'Channels',

    /**
     * Executes the sendchannelmsg command.
     * Usage: !sendchannelmsg <channel_jid> | <your_message_text>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (isOwner).
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;

        if (!context.isOwner) {
            return await sock.sendMessage(chatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }

        const input = args.join(' ').trim();
        const parts = input.split('|').map(p => p.trim());

        if (parts.length < 2 || !parts[0] || !parts[1]) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide channel JID and message text. Example: \`${context.commandPrefix}sendchannelmsg 1234567890@newsletter | Hello Channel!\`` }, { quoted: message });
        }

        const targetChannelJid = jidNormalizedUser(parts[0]);
        const messageText = parts[1];

        if (!targetChannelJid.includes('@newsletter')) {
            return await sock.sendMessage(chatId, { text: '❌ *Invalid JID*\n\nInvalid channel JID format. It should end with `@newsletter`.' }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: `Sending message to channel \`${targetChannelJid}\`...` }, { quoted: message });

            // Send the message directly to the channel JID
            await sock.sendMessage(targetChannelJid, { text: messageText });

            await sock.sendMessage(chatId, { text: `✅ *Message Sent!* Message successfully sent to channel \`${targetChannelJid}\`.` }, { quoted: message });
            logger.info(`Message sent to channel ${targetChannelJid} by owner.`);

        } catch (error) {
            logger.error(`Error sending message to channel "${targetChannelJid}":`, error);
            let errorMessage = 'An unexpected error occurred while sending the message to the channel.';
            if (error.message.includes('not a participant') || error.message.includes('not found')) {
                errorMessage = 'The bot is not following this channel, or the channel JID is incorrect.';
            } else if (error.message.includes('not allowed to send')) {
                errorMessage = 'The bot does not have permission to send messages to this channel (e.g., not an admin).';
            }
            await sock.sendMessage(chatId, { text: `❌ *Channel Message Error*\n\n${errorMessage}` }, { quoted: message });
        }
    },
};