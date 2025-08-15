// src/commands/admin/removepremium.js
import { jidNormalizedUser } from 'baileys-x';

export default {
    name: 'removepremium',
    aliases: ['delprem', 'unpremium'],
    description: 'Removes premium status for a user via external API. (Owner Only, requires Creator Code)',
    isPremium: false,
    groupOnly: false,
    privateOnly: true,
    adminOnly: true,
    category: 'Admin',

    async execute(sock, message, args, logger, { isOwner, ownerJid, commandPrefix }) {
        const chatId = message.key.remoteJid;

        const EXTERNAL_API_URL = process.env.EXTERNAL_PREMIUM_API_URL;
        if (!EXTERNAL_API_URL) {
            return await sock.sendMessage(chatId, { text: '❌ *Configuration Error*\n\nEXTERNAL_PREMIUM_API_URL is not set in .env. Premium commands cannot be used.' }, { quoted: message });
        }

        if (!isOwner) {
            return await sock.sendMessage(chatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }
        
        // New command structure: .removepremium <user_number> <creator_code>
        if (args.length < 2) {
            return await sock.sendMessage(chatId, { text: `Usage: ${commandPrefix}removepremium <user_number> <creator_code>` }, { quoted: message });
        }

        let targetNumber = args[0].replace(/\D/g, '');
        const creatorCodeProvided = args[1];

        if (creatorCodeProvided !== process.env.CREATOR_CODE) {
            return await sock.sendMessage(chatId, { text: '❌ *Authentication Failed*\n\nInvalid creator code.' }, { quoted: message });
        }

        if (!targetNumber.startsWith('254') && targetNumber.length === 9) {
            targetNumber = `254${targetNumber}`;
        }

        try {
            const response = await fetch(`${EXTERNAL_API_URL}/premiumremove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: targetNumber,
                    creatorCode: creatorCodeProvided,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                await sock.sendMessage(chatId, { text: `✅ *Premium Removed*\n\nUser *${targetNumber}* no longer has premium access.` }, { quoted: message });
                logger.info(`Premium removed for ${targetNumber} by ${message.key.participant} via API.`);
            } else {
                await sock.sendMessage(chatId, { text: `❌ *API Error*\n\nFailed to remove premium user: ${result.message || 'Unknown error from API'}` }, { quoted: message });
                logger.error(`API error removing premium for ${targetNumber}: ${result.message || response.statusText}`);
            }
        } catch (error) {
            logger.error(`Error in removepremium command for ${targetNumber}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn error occurred while connecting to the premium service.' }, { quoted: message });
        }
    },
};