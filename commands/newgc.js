// src/commands/groups/newgc.js

import { isJidGroup } from "baileys-x"; // Ensure isJidGroup is imported

export default {
    name: 'newgc',
    aliases: ["creategroup", "makegroup", "newgroup"],
    description: "Create a new WhatsApp group with advanced member management and error handling. (Owner Only)",
    isPremium: false, // Can be set to true if group creation is a premium feature
    groupOnly: false, // Can be used in private chat with bot
    privateOnly: false,
    adminOnly: true, // Only bot owner/admin can use this (Owner bypasses adminOnly if applicable)
    category: 'Groups',

    /**
     * Executes the newgc command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context like { isGroup, isOwner, isAdmin }.
     */
    async execute(sock, message, args, logger, { isGroup, isOwner, isAdmin }) {
        const chatId = message.key.remoteJid; // The JID where the command was sent
        const senderJid = message.key.participant || chatId; // Sender's JID

        // Owner check using the context flag
        if (!isOwner) {
            logger.warn(`Non-owner (${senderJid}) attempted to use newgc command.`);
            return await sock.sendMessage(chatId, {
                text: "❌ *ACEPHAR Access Denied*\n\n🔒 Only the *ACEPHAR Bot Owner* can create groups using this premium feature.\n💡 _Contact Ernest Tech House for group creation requests._"
            }, { quoted: message });
        }

        // Help/Info command
        if (!args[0] || args[0].toLowerCase() === "info" || args[0].toLowerCase() === "help") {
            return await sock.sendMessage(chatId, {
                text: `📋 *ACEPHAR Group Creator - Usage Guide*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `🆕 *Basic Usage:*\n` +
                    `\`\`\`.newgc Group Name\`\`\`\n\n` +
                    `👥 *Add Members:*\n` +
                    `• Reply to someone: Creates group with that person\n` +
                    `• Tag users: \`\`\`.newgc My Group @user1 @user2\`\`\`\n` +
                    `• Combine both methods for multiple adds\n\n` +
                    `📝 *Examples:*\n` +
                    `• \`\`\`.newgc Family Chat\`\`\`\n` +
                    `• \`\`\`.newgc Work Team @john @sarah\`\`\`\n\n` +
                    `⚠️ *Limits:*\n` +
                    `• Group name: Max 60 characters\n` +
                    `• Members: WhatsApp limits apply\n\n` +
                    `🔥 _Powered by Ernest Tech House - The Premium Bot Experience_`
            }, { quoted: message });
        }

        // Extract group name
        let groupName = args.join(' ').trim();

        // Remove mentions from group name but keep the original for participant extraction
        groupName = groupName.replace(/@\d+/g, '').trim(); // Regex to remove @numbers

        // Validate group name
        if (!groupName || groupName.length < 2) {
            logger.warn(`Invalid group name provided by ${senderJid}: "${groupName}"`);
            return await sock.sendMessage(chatId, {
                text: "❌ *ACEPHAR Invalid Group Name*\n\n📝 Please provide a proper group name (minimum 2 characters).\n💡 Example: `.newgc My Awesome Group`"
            }, { quoted: message });
        }

        // Limit group name length
        if (groupName.length > 60) {
            groupName = groupName.substring(0, 60);
            logger.info(`Truncated group name to 60 characters: "${groupName}"`);
        }

        // Collect participants
        let participants = [];

        // Always include the bot owner (the sender of the command, if owner)
        if (senderJid) {
            participants.push(senderJid);
        }

        // Add quoted message sender
        // Check for quoted message's contextInfo directly
        if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            const quotedParticipant = message.message.extendedTextMessage.contextInfo.participant;
            if (quotedParticipant && !isJidGroup(quotedParticipant)) { // Ensure it's not a group JID
                participants.push(quotedParticipant);
            }
        }

        // Add mentioned users
        // Check for mentionedJid directly from contextInfo
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid && Array.isArray(message.message.extendedTextMessage.contextInfo.mentionedJid)) {
            participants.push(...message.message.extendedTextMessage.contextInfo.mentionedJid);
        }

        // Clean and validate participants
        participants = participants
            .filter(p => p && typeof p === 'string') // Remove invalid entries
            .map(p => p.includes('@') ? p : `${p}@s.whatsapp.net`) // Ensure proper format
            .filter(p => p.endsWith('@s.whatsapp.net')) // Only individual chats
            .filter((p, index, arr) => arr.indexOf(p) === index); // Remove duplicates

        logger.info(`Attempting to create group "${groupName}" with participants: ${participants.map(p => p.split('@')[0]).join(', ')}`);

        let group;
        try {
            // Try creating with participants first
            if (participants.length > 1) { // Need at least 2 participants (owner + at least one other)
                group = await sock.groupCreate(groupName, participants);
            } else {
                // Create with just the owner if no other valid participants were found
                group = await sock.groupCreate(groupName, [senderJid]);
            }
        } catch (createError) {
            logger.error('Group creation error:', createError);

            // Fallback: try creating with just the owner if initial participant addition failed
            try {
                group = await sock.groupCreate(groupName, [senderJid]);
                logger.info('Fallback group creation with only owner successful.');
            } catch (fallbackError) {
                logger.error('Fallback group creation failed:', fallbackError);
                return await sock.sendMessage(chatId, {
                    text: `❌ *ACEPHAR Group Creation Failed*\n\n🚫 Could not create the group "${groupName}".\n\n` +
                        `💡 *Possible reasons:*\n` +
                        `• Invalid participant numbers\n` +
                        `• WhatsApp rate limiting (try again later)\n` +
                        `• Network connectivity issues\n\n` +
                        `🔄 _Please try again in a few moments._\n` +
                        `🏠 _Contact Ernest Tech House Support for assistance._`
                }, { quoted: message });
            }
        }

        if (!group || !group.id) {
            logger.error(`Group creation returned no valid group ID for "${groupName}".`);
            return await sock.sendMessage(chatId, {
                text: "❌ *ACEPHAR Creation Failed*\n\n😞 Group creation returned no valid group ID.\n🔄 Please try again later."
            }, { quoted: message });
        }

        logger.info(`Group created successfully: ${group.id}`);

        // Send welcome message to the new group
        try {
            const userName = message.pushName || senderJid.split('@')[0] || "Owner";
            // Get current year for copyright notice
            const currentYear = new Date().getFullYear();
            const welcomeMessage =
                `🎉 *Welcome to ${groupName}!* 🎉\n\n` +
                `👋 Created by: *${userName}*\n` +
                `🤖 Managed by: *ACEPHAR Bot v${process.env.BOT_VERSION || '2.1.0'}*\n` +
                `📅 Created: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}\n\n` + // Use EAT timezone
                `🚀 _Let's make this group awesome with ACEPHAR's premium features!_\n` +
                `©️ ${currentYear} Ernest Tech House. All rights reserved.` +
                `\n🏆 _Powered by Ernest Tech House_`;


            await sock.sendMessage(group.id, { text: welcomeMessage });
            logger.info(`Sent welcome message to new group ${group.id}`);
        } catch (welcomeError) {
            logger.error('Failed to send welcome message to new group:', welcomeError);
        }

        // Get invite link
        let inviteLink = null;
        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit for group to be fully created
            const inviteCode = await sock.groupInviteCode(group.id);
            inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
            logger.info(`Generated invite link for new group ${group.id}: ${inviteLink}`);
        } catch (inviteError) {
            logger.error('Failed to get invite link for new group:', inviteError);
        }

        // Send success message back to the sender
        const successMessage =
            `✅ *ACEPHAR Group Created Successfully!*\n\n` +
            `📋 *Group Name:* ${groupName}\n` +
            `👥 *Members Added:* ${participants.length}\n` +
            `🆔 *Group ID:* \`${group.id}\`\n\n` +
            (inviteLink ? `🔗 *Invite Link:*\n${inviteLink}\n\n` : '') +
            `🎯 *Pro Tip:* You can now manage this group using ACEPHAR's powerful commands!\n` +
            `💪 _Group ready for premium action!_`;

        return await sock.sendMessage(chatId, {
            text: successMessage
        }, { quoted: message });

    } // Removed the comma here
    // The catch block belongs directly after the try block, inside the execute function.
    // No comma is needed between the end of the try block's content and the catch keyword.
}
//dilemma idle gap pride trip design between puzzle carpet awful team possible