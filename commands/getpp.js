// src/commands/utility/getpp.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'getpp',
    aliases: ['getdp', 'profilepic'],
    description: 'Fetches the profile picture of a user or group. Usage: !getpp <user_number_or_group_id>',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the getpp command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        let targetId = args[0]?.trim();

        if (!targetId) {
            // If no ID provided, try to get PP of the sender
            targetId = message.key.participant || message.key.remoteJid;
            if (targetId.endsWith('@g.us')) { // If in group, default to group PP
                targetId = message.key.remoteJid;
            }
            await sock.sendMessage(chatId, { text: `🔎 Fetching profile picture for ${targetId.split('@')[0]}...` }, { quoted: message });
        } else {
            // Normalize the input ID
            if (!targetId.includes('@s.whatsapp.net') && !targetId.includes('@g.us')) {
                // Assume it's a number, append @s.whatsapp.net
                targetId = jidNormalizedUser(`${targetId.replace(/\D/g, '')}@s.whatsapp.net`);
            } else {
                targetId = jidNormalizedUser(targetId); // Normalize if it's already a JID
            }
            await sock.sendMessage(chatId, { text: `🔎 Fetching profile picture for \`${targetId.split('@')[0]}\`...` }, { quoted: message });
        }


        try {
            const ppUrl = await sock.profilePictureUrl(targetId, 'image'); // 'image' for high resolution

            if (ppUrl) {
                await sock.sendMessage(chatId, { image: { url: ppUrl }, caption: `🖼️ *Profile Picture for ${targetId.split('@')[0]}*` }, { quoted: message });
                logger.info(`Profile picture sent for ${targetId}.`);
            } else {
                await sock.sendMessage(chatId, { text: `❌ *No Profile Picture Found*\n\nCould not retrieve profile picture for \`${targetId.split('@')[0]}\`. They might not have one set, or their privacy settings prevent it.` }, { quoted: message });
                logger.warn(`No profile picture found for ${targetId}.`);
            }
        } catch (error) {
            logger.error(`Error fetching profile picture for ${targetId}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *Error*\n\nAn error occurred while fetching the profile picture. Please try again.' }, { quoted: message });
        }
    },
};