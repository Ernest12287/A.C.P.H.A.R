// src/commands/groups/kick.js

export default {
    name: 'kick',
    description: 'Removes a replied-to user from the group. Bot must be an admin.',
    category: 'groups',
    usage: 'kick',
    adminOnly: true,
    groupOnly: true,

    async execute(sock, message, args, logger) {
        const chatId = message.key.remoteJid;
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // Check if a message was replied to
        if (!quoted) {
            await sock.sendMessage(chatId, { text: '❌ Please reply to the user you want to kick.' }, { quoted: message });
            return;
        }

        const quotedJid = message.message.extendedTextMessage.contextInfo.participant;
        
        try {
            // Attempt to remove the user from the group
            await sock.groupParticipantsUpdate(chatId, [quotedJid], 'remove');
            await sock.sendMessage(chatId, { text: `✅ Successfully kicked ${quotedJid.split('@')[0]}.` }, { quoted: message });
            logger.info(`Kicked user ${quotedJid} from group ${chatId}.`);
        } catch (error) {
            logger.error(`Failed to kick user ${quotedJid}:`, error);
            await sock.sendMessage(chatId, { text: '⚠️ Failed to kick the user. Make sure the bot is a group admin.' }, { quoted: message });
        }
    }
};
