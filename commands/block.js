// src/commands/admin/block.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'block',
    aliases: [],
    description: 'Blocks a user from interacting with the bot. If used without a number in a private chat, blocks the sender of that chat. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false, // Can be used in private or group, but targets are different
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the block command.
     * Usage: !block <user_number> OR !block (in private chat with target)
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (isOwner, isGroup).
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const senderJid = context.senderJid; // The JID of the person who sent the command

        if (!context.isOwner) {
            return await sock.sendMessage(chatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }

        let targetJid = null;
        let displayTargetNumber = null;

        // Determine target JID based on arguments or chat context
        if (args.length > 0) {
            // If a number is provided as an argument
            const targetNumber = args[0]?.replace(/\D/g, ''); // Remove non-digits
            if (!targetNumber || targetNumber.length < 7) {
                return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a valid user number to block. Example: \`${context.commandPrefix}block 254712345678\`` }, { quoted: message });
            }
            targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
            displayTargetNumber = targetNumber;
        } else if (!context.isGroup && !context.isChannel) {
            // If no number is provided, and command is used in a private chat (not group/channel)
            targetJid = chatId; // The chat ID is the target JID in a private chat
            displayTargetNumber = chatId.split('@')[0];
        } else {
            // If no number is provided and it's a group or channel chat
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nWhen used in a group or channel, you must provide the number of the user to block. Example: \`${context.commandPrefix}block 254712345678\`` }, { quoted: message });
        }

        // Prevent blocking self
        if (targetJid === sock.user.id) {
            return await sock.sendMessage(chatId, { text: '😂 *Nice Try!* I cannot block myself.' }, { quoted: message });
        }
        // Prevent owner from blocking themselves (if they try to block their own number)
        if (targetJid === senderJid) {
             return await sock.sendMessage(chatId, { text: '😅 *Hold On!* You cannot block yourself with this command.' }, { quoted: message });
        }


        try {
            await sock.sendMessage(chatId, { text: `🚫 Attempting to block user \`${displayTargetNumber}\`...` }, { quoted: message });

            // --- IMPORTANT: Send disrespect message BEFORE blocking ---
            const disrespectMessage = 'Damn(user has blocked you with the best bot disrespect level 1 )';
            try {
                // Send the message to the target JID
                await sock.sendMessage(targetJid, { text: disrespectMessage });
                logger.info(`Disrespect message sent to ${targetJid} before blocking.`);
            } catch (msgError) {
                logger.warn(`Failed to send disrespect message to ${targetJid}: ${msgError.message}. Proceeding with block.`);
                // Don't return here, still try to block even if message fails
            }
            // --- End Disrespect Message Logic ---

            await sock.updateBlockStatus(targetJid, 'block');
            await sock.sendMessage(chatId, { text: `✅ *Success!* User \`${displayTargetNumber}\` has been blocked.` }, { quoted: message });
            logger.info(`User ${targetJid} blocked by owner.`);
        } catch (error) {
            logger.error(`Error blocking user ${targetJid}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *Block Error*\n\nAn error occurred while trying to block the user. They might already be blocked, or the number is incorrect/invalid.' }, { quoted: message });
        }
    },
};