// src/commands/channels/followchannel.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'followchannel',
    aliases: ['joinchannel', 'subscribechannel'],
    description: 'Makes the bot follow a WhatsApp channel. Usage: !followchannel <channel_jid_or_invite_link>',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Only bot owner should decide which channels to follow
    category: 'Channels',

    /**
     * Executes the followchannel command.
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
        if (!input) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a channel JID (e.g., \`1234567890@newsletter\`) or an invite link (e.g., \`https://whatsapp.com/channel/xxxxx\`). Example: \`${context.commandPrefix}followchannel https://whatsapp.com/channel/xxxxx\`` }, { quoted: message });
        }

        let channelJid = null;
        // Attempt to parse invite link
        const inviteMatch = input.match(/(?:https?:\/\/)?whatsapp\.com\/channel\/([a-zA-Z0-9_-]+)/);
        if (inviteMatch && inviteMatch[1]) {
            try {
                // Get metadata by invite to find the JID
                const metadata = await sock.newsletterMetadata('invite', inviteMatch[1]);
                if (metadata && metadata.id) {
                    channelJid = metadata.id;
                } else {
                    return await sock.sendMessage(chatId, { text: '❌ *Channel Not Found*\n\nCould not resolve channel JID from the provided invite link.' }, { quoted: message });
                }
            } catch (metaError) {
                logger.error(`Error resolving channel JID from invite link "${input}":`, metaError);
                return await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nFailed to resolve channel JID from the invite link. It might be invalid or expired.' }, { quoted: message });
            }
        } else if (input.includes('@newsletter')) {
            channelJid = jidNormalizedUser(input); // Assume it's a direct JID
        } else {
            return await sock.sendMessage(chatId, { text: `❌ *Invalid Input*\n\nPlease provide a valid channel JID (e.g., \`1234567890@newsletter\`) or a full WhatsApp channel invite link.` }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: `🔄 Attempting to follow channel \`${channelJid}\`...` }, { quoted: message });

            await sock.newsletterFollow(channelJid);
            await sock.sendMessage(chatId, { text: `✅ *Success!* The bot is now following channel \`${channelJid}\`.` }, { quoted: message });
            logger.info(`Bot successfully followed channel: ${channelJid}`);

        } catch (error) {
            logger.error(`Error following channel "${channelJid}":`, error);
            let errorMessage = 'An unexpected error occurred while trying to follow the channel.';
            if (error.message.includes('already a participant')) {
                errorMessage = 'The bot is already following this channel.';
            } else if (error.message.includes('not found')) {
                errorMessage = 'Channel not found or the JID/link is incorrect.';
            }
            await sock.sendMessage(chatId, { text: `❌ *Channel Follow Error*\n\n${errorMessage}` }, { quoted: message });
        }
    },
};