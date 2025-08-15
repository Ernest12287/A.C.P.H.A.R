// src/commands/utility/fetchstatus.js
import pkg from 'baileys-x';
const { jidNormalizedUser } = pkg;

export default {
    name: 'fetchstatus',
    aliases: ['getstatus', 'statusof'],
    description: 'Fetches the WhatsApp status (About) of a user. Usage: !fetchstatus <user_number>',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the fetchstatus command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const targetNumber = args[0]?.replace(/\D/g, ''); // Remove non-digits

        if (!targetNumber || targetNumber.length < 7) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a valid phone number. Example: \`${context.commandPrefix}fetchstatus 254712345678\`` }, { quoted: message });
        }

        const targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);

        try {
            await sock.sendMessage(chatId, { text: `🔎 Fetching status for \`${targetNumber}\`...` }, { quoted: message });
            const status = await sock.fetchStatus(targetJid);

            if (status && status.status) {
                await sock.sendMessage(chatId, { text: `💬 *Status for ${targetNumber}:*\n\`\`\`\n${status.status}\n\`\`\`\n_Set at: ${new Date(status.setAt * 1000).toLocaleString()}_` }, { quoted: message });
                logger.info(`Status fetched for ${targetJid}.`);
            } else {
                await sock.sendMessage(chatId, { text: `❌ *Status Not Found*\n\nCould not retrieve status for \`${targetNumber}\`. They might not have one set, or their privacy settings prevent it.` }, { quoted: message });
                logger.warn(`Status not found for ${targetJid}.`);
            }
        } catch (error) {
            logger.error(`Error fetching status for ${targetJid}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *Error*\n\nAn error occurred while fetching the status. Please try again.' }, { quoted: message });
        }
    },
};