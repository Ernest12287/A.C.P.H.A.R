// src/commands/groups/link.js

import { isJidGroup } from "baileys-x";

export default {
    name: 'link',
    aliases: ['grouplink', 'getlink'],
    description: 'Gets the current group invite link. (Admin Only)',
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: true,
    category: 'Groups',

    /**
     * Executes the link command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, { isGroup, isOwner, isAdmin }) {
        const chatId = message.key.remoteJid;

        if (!isJidGroup(chatId)) {
            logger.warn(`Link command attempted in private chat by ${message.key.participant || chatId}`);
            return sock.sendMessage(chatId, { text: "❌ *ACEPHAR Group Command*\n\nThis command can only be used in *groups*." });
        }

        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            const botJid = sock.user.id;
            const botIsAdmin = groupMetadata.participants.some(p => p.id === botJid && p.admin);

            if (!botIsAdmin) {
                logger.warn(`Bot is not admin in group ${chatId} for link command.`);
                return sock.sendMessage(chatId, { text: "❌ *ACEPHAR Permissions Error*\n\nI need to be a *group administrator* to get the invite link." });
            }

            const inviteCode = await sock.groupInviteCode(chatId);
            const groupLink = `https://chat.whatsapp.com/${inviteCode}`;

            await sock.sendMessage(chatId, { text: `🔗 *ACEPHAR Group Invite Link:*\n${groupLink}\n\n_Share this link to invite new members to your premium group!_` });
            logger.info(`Sent invite link for group ${chatId}. Code: ${inviteCode}`);

        } catch (error) {
            logger.error(`Error in link command for group ${chatId}:`, error);
            await sock.sendMessage(chatId, { text: `❌ *ACEPHAR System Error*\n\nAn error occurred while trying to get the invite link. Please ensure I have administrator privileges.` });
        }
    },
};