// src/commands/channels/enablechannelreply.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'enablechannelreply',
    aliases: ['enablereply', 'chreplyon'],
    description: 'Enables bot to reply to commands in a specified channel. (Owner Only)',
    isPremium: true, // This command itself is premium, as it enables a premium feature
    groupOnly: false,
    privateOnly: true, // Only usable in private chat with bot
    adminOnly: true, // Only bot owner can enable/disable this
    category: 'Channels',

    /**
     * Executes the enablechannelreply command.
     * Usage: !enablechannelreply <channel_jid>
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
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide the channel JID. Example: \`${context.commandPrefix}enablechannelreply 1234567890@newsletter\`` }, { quoted: message });
        }

        const channelJid = jidNormalizedUser(channelJidInput);

        if (!channelJid.endsWith('@newsletter')) {
            return await sock.sendMessage(chatId, { text: '❌ *Invalid JID*\n\nThe provided JID does not appear to be a valid channel JID (must end with `@newsletter`).' }, { quoted: message });
        }

        // Verify channel exists and bot can access its metadata
        try {
            await sock.sendMessage(chatId, { text: `🔎 Verifying channel \`${channelJid}\`...` }, { quoted: message });
            const metadata = await sock.newsletterMetadata('jid', channelJid);
            if (!metadata || !metadata.id) {
                return await sock.sendMessage(chatId, { text: `❌ *Channel Not Found*\n\nCould not find metadata for channel \`${channelJid}\`. Ensure the JID is correct and the bot has access.` }, { quoted: message });
            }
            // Check if bot is following the channel, if not, suggest following
            // This is optional, but good practice. If bot isn't following, it can't reply.
            // Note: `newsletterMetadata` might not directly tell us if bot is following.
            // We assume if metadata is fetched, the bot has some level of access.
        } catch (error) {
            logger.error(`Error verifying channel ${channelJid}:`, error);
            return await sock.sendMessage(chatId, { text: `❌ *Verification Error*\n\nFailed to verify channel \`${channelJid}\`. It might be invalid or inaccessible.` }, { quoted: message });
        }


        if (context.bot.allowedChannelJidsForReplies.has(channelJid)) {
            return await sock.sendMessage(chatId, { text: `ℹ️ Channel \`${channelJid}\` is *already enabled* for bot replies.` }, { quoted: message });
        }

        context.bot.allowedChannelJidsForReplies.add(channelJid);
        await sock.sendMessage(chatId, { text: `✅ *Success!* Bot replies are now *enabled* for channel \`${channelJid}\`.` }, { quoted: message });
        logger.info(`Bot replies enabled for channel: ${channelJid}`);
    },
};