// src/commands/channels/createchannel.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'createchannel',
    aliases: ['newchannel', 'mkchannel'],
    description: 'Creates a new WhatsApp channel. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Only bot owner can create channels
    category: 'Channels',

    /**
     * Executes the createchannel command.
     * Usage: !createchannel <Channel Name> | <Channel Description>
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

        if (parts.length < 1 || !parts[0]) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a channel name. Example: \`${context.commandPrefix}createchannel My Awesome Channel | This is a cool channel about bots!\`` }, { quoted: message });
        }

        const channelName = parts[0];
        const channelDescription = parts[1] || `Welcome to ${channelName}! Created by ACEPHAR Bot.`; // Default description

        try {
            await sock.sendMessage(chatId, { text: `🚀 Creating channel "*${channelName}*"...` }, { quoted: message });

            const newChannel = await sock.newsletterCreate(channelName, channelDescription);

            if (newChannel && newChannel.jid) {
                const responseMessage = `
🎉 *Channel Created Successfully!* 🎉

*Name:* ${newChannel.name || channelName}
*Description:* ${newChannel.description || channelDescription}
*JID:* \`${newChannel.jid}\`
*Invite Link:* ${newChannel.invite || 'N/A'}

_You can now use this JID to manage your channel._
                `.trim();
                await sock.sendMessage(chatId, { text: responseMessage }, { quoted: message });
                logger.info(`Channel "${channelName}" created successfully with JID: ${newChannel.jid}`);
            } else {
                await sock.sendMessage(chatId, { text: '❌ *Channel Creation Failed*\n\nCould not create the channel. Please try again.' }, { quoted: message });
                logger.error(`Failed to create channel "${channelName}". Response: ${JSON.stringify(newChannel)}`);
            }

        } catch (error) {
            logger.error(`Error creating channel "${channelName}":`, error);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn unexpected error occurred while trying to create the channel. Ensure your bot has the necessary permissions.' }, { quoted: message });
        }
    },
};