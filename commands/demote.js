// src/commands/groups/demote.js

import { jidNormalizedUser, isJidGroup } from "baileys-x";

export default {
    name: 'demote',
    aliases: ['removemod'],
    description: 'Demotes a mentioned user from group admin. (Admin Only)',
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: true,
    category: 'Groups',

    /**
     * Executes the demote command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, { isGroup, isOwner, isAdmin }) {
        const senderJid = message.key.remoteJid;
        const groupJid = senderJid;

        if (!isJidGroup(groupJid)) {
            await sock.sendMessage(senderJid, { text: "This command can only be used in groups." });
            return;
        }

        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;

        if (!mentionedJids || mentionedJids.length === 0) {
            await sock.sendMessage(senderJid, { text: "Please mention the user(s) you want to demote. Example: `!demote @user`" });
            return;
        }

        try {
            const groupMetadata = await sock.groupMetadata(groupJid);
            const botJid = sock.user.id;
            const botIsAdmin = groupMetadata.participants.some(p => p.id === botJid && p.admin);

            if (!botIsAdmin) {
                await sock.sendMessage(senderJid, { text: "I need to be a *group administrator* to demote members." });
                return;
            }

            const demotedUsers = [];
            for (const jid of mentionedJids) {
                // Check if the user is an admin
                const participant = groupMetadata.participants.find(p => p.id === jid);
                if (!participant || !participant.admin) {
                    await sock.sendMessage(senderJid, { text: `${jid.split('@')[0]} is not an admin.` });
                    continue;
                }
                // Prevent demoting the group creator/owner (if applicable) or the bot's owner
                if (participant.admin === 'superadmin' || jid === jidNormalizedUser(`${process.env.OWNER_NUMBER}@s.whatsapp.net`)) {
                    await sock.sendMessage(senderJid, { text: `Cannot demote ${jid.split('@')[0]}. They are a super admin or the bot owner.` });
                    continue;
                }

                const response = await sock.groupParticipantsUpdate(groupJid, [jid], 'demote');
                if (response[0]?.status === '200') {
                    demotedUsers.push(jid.split('@')[0]);
                    logger.info(`Demoted ${jid} in group ${groupJid}`);
                } else {
                    logger.warn(`Failed to demote ${jid}: ${response[0]?.status || 'Unknown error'}`);
                    await sock.sendMessage(senderJid, { text: `Failed to demote ${jid.split('@')[0]}. Reason: ${response[0]?.status || 'Unknown'}` });
                }
            }

            if (demotedUsers.length > 0) {
                await sock.sendMessage(senderJid, { text: `✅ Successfully demoted: ${demotedUsers.join(', ')}` });
            } else {
                await sock.sendMessage(senderJid, { text: "No users were demoted, or an error occurred for all mentioned users." });
            }

        } catch (error) {
            logger.error(`Error in demote command for group ${groupJid}:`, error);
            await sock.sendMessage(senderJid, { text: `❌ An error occurred while trying to demote the user(s). Please ensure I have administrator privileges.` });
        }
    },
};
