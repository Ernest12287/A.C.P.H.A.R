// src/commands/groups/revoke.js

import { isJidGroup } from "baileys-x";

export default {
    name: 'revoke',
    aliases: ['resetlink'],
    description: 'Revokes the current group invite link, generating a new one. (Admin Only)',
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: true,
    category: 'Groups',

    /**
     * Executes the revoke command.
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

        try {
            const groupMetadata = await sock.groupMetadata(groupJid);
            const botJid = sock.user.id;
            const botIsAdmin = groupMetadata.participants.some(p => p.id === botJid && p.admin);

            if (!botIsAdmin) {
                await sock.sendMessage(senderJid, { text: "I need to be a *group administrator* to revoke the invite link." });
                return;
            }

            const newCode = await sock.groupRevokeInvite(groupJid);
            const newLink = `https://chat.whatsapp.com/${newCode}`;

            await sock.sendMessage(senderJid, { text: `✅ Group invite link revoked. New link: ${newLink}` });
            logger.info(`Revoked invite link for group ${groupJid}. New code: ${newCode}`);

        } catch (error) {
            logger.error(`Error in revoke command for group ${groupJid}:`, error);
            await sock.sendMessage(senderJid, { text: `❌ An error occurred while trying to revoke the invite link. Please ensure I have administrator privileges.` });
        }
    },
};
