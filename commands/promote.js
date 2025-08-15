// src/commands/groups/promote.js

import { jidNormalizedUser, isJidGroup } from "baileys-x";

export default {
    name: 'promote',
    aliases: ['makemod'],
    description: 'Promotes a mentioned user to group admin. (Admin Only)',
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: true,
    category: 'Groups',

    /**
     * Executes the promote command.
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
            await sock.sendMessage(senderJid, { text: "Please mention the user(s) you want to promote. Example: `!promote @user`" });
            return;
        }

        try {
            const groupMetadata = await sock.groupMetadata(groupJid);
            const botJid = sock.user.id;
            const botIsAdmin = groupMetadata.participants.some(p => p.id === botJid && p.admin);

            if (!botIsAdmin) {
                await sock.sendMessage(senderJid, { text: "I need to be a *group administrator* to promote members." });
                return;
            }

            const promotedUsers = [];
            for (const jid of mentionedJids) {
                // Check if the user is already an admin
                const participant = groupMetadata.participants.find(p => p.id === jid);
                if (participant && participant.admin) {
                    await sock.sendMessage(senderJid, { text: `${jid.split('@')[0]} is already an admin.` });
                    continue;
                }

                const response = await sock.groupParticipantsUpdate(groupJid, [jid], 'promote');
                if (response[0]?.status === '200') {
                    promotedUsers.push(jid.split('@')[0]);
                    logger.info(`Promoted ${jid} in group ${groupJid}`);
                } else {
                    logger.warn(`Failed to promote ${jid}: ${response[0]?.status || 'Unknown error'}`);
                    await sock.sendMessage(senderJid, { text: `Failed to promote ${jid.split('@')[0]}. Reason: ${response[0]?.status || 'Unknown'}` });
                }
            }

            if (promotedUsers.length > 0) {
                await sock.sendMessage(senderJid, { text: `✅ Successfully promoted: ${promotedUsers.join(', ')}` });
            } else {
                await sock.sendMessage(senderJid, { text: "No users were promoted, or an error occurred for all mentioned users." });
            }

        } catch (error) {
            logger.error(`Error in promote command for group ${groupJid}:`, error);
            await sock.sendMessage(senderJid, { text: `❌ An error occurred while trying to promote the user(s). Please ensure I have administrator privileges.` });
        }
    },
};
