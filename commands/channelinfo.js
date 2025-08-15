// src/commands/channels/channelinfo.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'channelinfo',
    aliases: ['ci', 'channeldata'],
    description: 'Gets metadata for a WhatsApp channel by JID or invite link. Usage: !channelinfo <channel_jid_or_invite_link>',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Channels',

    /**
     * Executes the channelinfo command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (channel JID or invite link).
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const input = args.join(' ').trim();

        if (!input) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a channel JID (e.g., \`1234567890@newsletter\`) or an invite link (e.g., \`https://whatsapp.com/channel/xxxxx\`). Example: \`${context.commandPrefix}channelinfo 1234567890@newsletter\`` }, { quoted: message });
        }

        let channelJid = null;
        let fetchType = 'direct'; // Default to direct JID lookup
        let fetchKey = input;

        // Attempt to parse invite link
        const inviteMatch = input.match(/(?:https?:\/\/)?whatsapp\.com\/channel\/([a-zA-Z0-9_-]+)/);
        if (inviteMatch && inviteMatch[1]) {
            fetchType = 'invite';
            fetchKey = inviteMatch[1]; // The invite code
        } else if (input.includes('@newsletter')) {
            channelJid = jidNormalizedUser(input); // Assume it's a direct JID
        } else {
            return await sock.sendMessage(chatId, { text: `❌ *Invalid Input*\n\nPlease provide a valid channel JID (e.g., \`1234567890@newsletter\`) or a full WhatsApp channel invite link.` }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: `🔎 Fetching channel info for "${input}"...` }, { quoted: message });

            let metadata;
            if (fetchType === 'invite') {
                metadata = await sock.newsletterMetadata(fetchType, fetchKey);
            } else { // 'direct' type, using the JID
                metadata = await sock.newsletterMetadata('jid', channelJid);
            }

            if (metadata && metadata.id) {
                const adminCount = await sock.newsletterAdminCount(metadata.id).catch(() => 'N/A'); // Get admin count, handle errors
                const responseMessage = `
📊 *Channel Information* 📊

*Name:* ${metadata.name || 'N/A'}
*JID:* \`${metadata.id}\`
*Description:* ${metadata.description || 'No description provided.'}
*Creation Time:* ${metadata.creationTime ? new Date(metadata.creationTime * 1000).toLocaleString() : 'N/A'}
*Followers:* ${metadata.subscribers || 'N/A'}
*Admins:* ${adminCount}
*Invite Link:* ${metadata.invite || 'N/A'}
*Owner JID:* ${metadata.ownerJid || 'N/A'}
                `.trim();
                await sock.sendMessage(chatId, { text: responseMessage }, { quoted: message });
                logger.info(`Channel info sent for ${input} to ${chatId}.`);
            } else {
                await sock.sendMessage(chatId, { text: '❌ *Channel Not Found*\n\nCould not retrieve information for the specified channel. It might not exist or the invite link/JID is incorrect.' }, { quoted: message });
                logger.warn(`Channel metadata not found for input: ${input}. Metadata: ${JSON.stringify(metadata)}`);
            }

        } catch (error) {
            logger.error(`Error fetching channel info for "${input}":`, error);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn unexpected error occurred while fetching channel information. Ensure the JID/link is correct and the bot has access.' }, { quoted: message });
        }
    },
};