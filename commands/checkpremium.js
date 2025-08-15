// src/commands/general/checkpremium.js
import { jidNormalizedUser } from 'baileys-x';

export default {
    name: 'checkpremium',
    aliases: ['ispremium', 'premstatus'],
    description: 'Checks the premium status of a user via external API. Defaults to your own status.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'General', // Or 'Utility' if you prefer

    /**
     * Executes the checkpremium command.
     * Usage: .checkpremium [user_number]
     * Example: .checkpremium 254712345678
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (senderJid).
     */
    async execute(sock, message, args, logger, { senderJid }) {
        const chatId = message.key.remoteJid;
        let targetNumber;

        if (args.length > 0) {
            targetNumber = args[0].replace(/\D/g, '');
            if (!targetNumber.startsWith('254') && targetNumber.length === 9) {
                targetNumber = `254${targetNumber}`;
            }
        } else {
            targetNumber = senderJid.split('@')[0]; // Default to sender's number
        }

        const EXTERNAL_API_URL = process.env.EXTERNAL_PREMIUM_API_URL;
        if (!EXTERNAL_API_URL) {
            return await sock.sendMessage(chatId, { text: '❌ *Configuration Error*\n\nEXTERNAL_PREMIUM_API_URL is not set in .env. Premium commands cannot be used.' }, { quoted: message });
        }

        try {
            const response = await fetch(`${EXTERNAL_API_URL}/premiuminfo?number=${targetNumber}`);
            const userInfo = await response.json();

            if (!response.ok || !userInfo || !userInfo.jid) { // Check for jid to ensure a valid user object
                return await sock.sendMessage(chatId, { text: `🚫 *Premium Status*\n\nUser *${targetNumber}* is currently *not a Premium Subscriber*.` }, { quoted: message });
            }

            let responseMessage;
            const expiryDate = new Date(userInfo.expiry);

            if (expiryDate > Date.now()) {
                const expiryString = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                responseMessage = `✨ *Premium Status* ✨\n\nUser *${targetNumber}* is a *Premium Subscriber*! 🎉\nExpires on: *${expiryString}*`;
            } else {
                const expiryString = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                responseMessage = `😔 *Premium Status*\n\nUser *${targetNumber}*'s premium has *expired* on *${expiryString}*.`;
            }

            await sock.sendMessage(chatId, { text: responseMessage }, { quoted: message });
            logger.info(`Checkpremium command executed for ${chatId} (target: ${targetNumber}) via API.`);

        } catch (error) {
            logger.error(`Error checking premium status for ${targetNumber}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn error occurred while connecting to the premium service.' }, { quoted: message });
        }
    },
};