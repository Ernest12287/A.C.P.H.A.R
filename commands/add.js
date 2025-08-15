// src/commands/groups/add.js

import { jidNormalizedUser, isJidGroup } from "baileys-x";

export default {
    name: 'add',
    aliases: ['inviteuser'],
    description: 'Adds a user to the group by their number. (Admin Only)',
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: true,
    category: 'Groups',

    /**
     * Executes the add command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (expected to be a phone number).
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

        const phoneNumber = args[0];
        if (!phoneNumber) {
            await sock.sendMessage(senderJid, { text: "Please provide a phone number to add (e.g., `!add 254712345678`)." });
            return;
        }

        // Normalize phone number to JID format
        const userJid = jidNormalizedUser(`${phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`);

        try {
            const groupMetadata = await sock.groupMetadata(groupJid);
            const botJid = sock.user.id;
            const botIsAdmin = groupMetadata.participants.some(p => p.id === botJid && p.admin);

            if (!botIsAdmin) {
                await sock.sendMessage(senderJid, { text: "I need to be a *group administrator* to add members." });
                return;
            }

            // Check if user is already in the group
            const isAlreadyInGroup = groupMetadata.participants.some(p => p.id === userJid);
            if (isAlreadyInGroup) {
                await sock.sendMessage(senderJid, { text: `User ${phoneNumber} is already in this group.` });
                return;
            }

            const response = await sock.groupParticipantsUpdate(groupJid, [userJid], 'add');

            if (response[0]?.status === '200') {
                await sock.sendMessage(senderJid, { text: `✅ Successfully added ${phoneNumber} to the group.` });
                logger.info(`Added ${phoneNumber} to group ${groupJid}`);
            } else {
                logger.warn(`Failed to add ${phoneNumber}: ${response[0]?.status || 'Unknown error'}`);
                let errorMessage = `Failed to add ${phoneNumber}.`;
                if (response[0]?.status === '403') {
                    errorMessage += ` The user might have privacy settings preventing direct addition, or I lack permissions.`;
                } else if (response[0]?.status === '408') {
                    errorMessage += ` The user is not a WhatsApp user.`;
                }
                await sock.sendMessage(senderJid, { text: `❌ ${errorMessage}` });
            }

        } catch (error) {
            logger.error(`Error in add command for group ${groupJid}:`, error);
            await sock.sendMessage(senderJid, { text: `❌ An error occurred while trying to add the user. Please ensure I have administrator privileges and the number is valid.` });
        }
    },
};
