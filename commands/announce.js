// src/commands/groups/announce.js

import { isJidGroup } from "baileys-x";

export default {
    name: 'announce',
    aliases: ['everyone', 'all', 'tagall'],
    description: 'Sends an announcement to the group, silently tagging all members. (Admin Only)',
    isPremium: true, // Making this a premium feature
    groupOnly: true,
    privateOnly: false,
    adminOnly: true, // Only bot owner/admin can use this
    category: 'Groups',

    /**
     * Executes the announce command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (the announcement text).
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, { isGroup, isOwner, isAdmin }) {
        const chatId = message.key.remoteJid;

        // Ensure it's a group chat
        if (!isJidGroup(chatId)) {
            logger.warn(`Announce command attempted in private chat by ${message.key.participant || chatId}`);
            return sock.sendMessage(chatId, {
                text: '❌ *ACEPHAR Group Command*\n\nThis command only works in *group chats*!',
            }, { quoted: message });
        }

        // Ensure bot is admin (already handled by adminOnly flag, but good for specific message)
        if (!isAdmin) {
            logger.warn(`Non-admin (${message.key.participant || chatId}) attempted to use announce command.`);
            return sock.sendMessage(chatId, {
                text: '❌ *ACEPHAR Access Denied*\n\n🔒 Only *group administrators* can use the `!announce` command.',
            }, { quoted: message });
        }

        const announcementText = args.join(' ').trim();
        if (!announcementText) {
            return sock.sendMessage(chatId, {
                text: '📋 *ACEPHAR Announce Usage*\n\nPlease provide the announcement text. Example: `!announce Important meeting at 3 PM today!`',
            }, { quoted: message });
        }

        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants.map(p => p.id); // Get all participant JIDs

            const finalAnnouncement = `
📢 *ACEPHAR Group Announcement!* 📢

${announcementText}

_⚡️ This message brought to you by ACEPHAR Bot._
            `.trim();

            await sock.sendMessage(chatId, {
                text: finalAnnouncement,
                mentions: participants, // Tag all participants silently
                contextInfo: {
                    mentionedJid: participants // Redundant but good practice
                }
            });
            logger.info(`Announce command executed in group ${chatId}. Tagged ${participants.length} members.`);

        } catch (error) {
            logger.error(`Error in announce command for group ${chatId}:`, error);
            await sock.sendMessage(chatId, {
                text: '❌ *ACEPHAR System Error*\n\nFailed to send announcement. Please ensure the bot is a group member and has necessary permissions.',
            }, { quoted: message });
        }
    },
};