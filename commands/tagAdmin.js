// src/commands/groups/tagAdmin.js

import { isJidGroup } from "baileys-x";

export default {
    name: 'tagadmin',
    aliases: ['admins', 'calladmin'],
    description: "Tags all group admins with a stylish message. (Group Only)",
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: false, // This command can be used by anyone in the group
    category: 'Groups',

    /**
     * Executes the tagAdmin command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, { isGroup, isOwner, isAdmin }) {
        const chatId = message.key.remoteJid;

        // Must be used in a group
        if (!isJidGroup(chatId)) {
            logger.warn(`tagAdmin command attempted in private chat by ${message.key.participant || chatId}`);
            return sock.sendMessage(chatId, {
                text: '❌ *ACEPHAR Group Command*\n\nThis command only works in *group chats*!',
            }, { quoted: message });
        }

        try {
            // Fetch group data and admins
            const groupMeta = await sock.groupMetadata(chatId);
            const admins = groupMeta.participants.filter(p => p.admin).map(p => p.id);

            if (admins.length === 0) {
                logger.warn(`No admins found in group ${chatId} for tagAdmin command.`);
                return sock.sendMessage(chatId, {
                    text: '⚠️ *ACEPHAR Alert*\n\nNo administrators found in this group. That’s suspicious...',
                }, { quoted: message });
            }

            // Build admin list text
            const adminList = admins.map((id, i) => `👑 *${i + 1}. @${id.split('@')[0]}*`).join('\n');

            const finalMsg = `
*📢 ACEPHAR Calling All Admins!*

This is a *Premium Summon* from ACEPHAR Bot 🔔
We need your royal presence in this matter.
Please attend immediately to ensure group harmony.

🛡️ *Current Group Administrators:*
${adminList}

_⚡️ Experience the power of ACEPHAR Bot!_
            `.trim();

            await sock.sendMessage(chatId, {
                text: finalMsg,
                mentions: admins, // This ensures all admins are tagged
                contextInfo: {
                    mentionedJid: admins // Redundant but good practice for some clients
                }
            }, { quoted: message });
            logger.info(`tagAdmin command executed in group ${chatId}. Tagged ${admins.length} admins.`);

        } catch (error) {
            logger.error(`Error in tagAdmin command for group ${chatId}:`, error);
            await sock.sendMessage(chatId, {
                text: '❌ *ACEPHAR System Error*\n\nFailed to tag admins. Something broke in the matrix. Please ensure the bot is a group member.',
            }, { quoted: message });
        }
    }
};