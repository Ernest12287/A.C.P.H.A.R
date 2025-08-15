// src/commands/channels/disablechannelreply.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'disablechannelreply',
    aliases: ['disablereply', 'chreplyoff'],
    description: 'Disables bot replies to commands in a specified channel. (Owner Only)',
    isPremium: true, // This command itself is premium
    groupOnly: false,
    privateOnly: true, // Only usable in private chat with bot
    adminOnly: true, // Only bot owner can enable/disable this
    category: 'Channels',

    /**
     * Executes the disablechannelreply command.
     * Usage: !disablechannelreply <channel_jid>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (channel JID).
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (isOwner, bot).
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;

        if (!context.isOwner) {
            return await sock.sendMessage(chatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }

        const channelJidInput = args[0]?.trim();

        if (!channelJidInput) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide the channel JID. Example: \`${context.commandPrefix}disablechannelreply 1234567890@newsletter\`` }, { quoted: message });
        }

        const channelJid = jidNormalizedUser(channelJidInput);

        if (!channelJid.endsWith('@newsletter')) {
            return await sock.sendMessage(chatId, { text: '❌ *Invalid JID*\n\nThe provided JID does not appear to be a valid channel JID (must end with `@newsletter`).' }, { quoted: message });
        }

        if (!context.bot.allowedChannelJidsForReplies.has(channelJid)) {
            return await sock.sendMessage(chatId, { text: `ℹ️ Channel \`${channelJid}\` is *not currently enabled* for bot replies.` }, { quoted: message });
        }

        context.bot.allowedChannelJidsForReplies.delete(channelJid);
        await sock.sendMessage(chatId, { text: `✅ *Success!* Bot replies are now *disabled* for channel \`${channelJid}\`.` }, { quoted: message });
        logger.info(`Bot replies disabled for channel: ${channelJid}`);
    },
};