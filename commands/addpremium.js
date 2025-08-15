// src/commands/admin/addpremium.js
import { jidNormalizedUser } from 'baileys-x';

export default {
    name: 'addpremium',
    aliases: ['addprem', 'setpremium'],
    description: 'Adds or extends premium status for a user via external API. (Owner Only, requires Creator Code)',
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

        // New command structure: .addpremium <user_number> <creator_code> <added_by_number> [duration_days]
        if (args.length < 3) {
            return await sock.sendMessage(chatId, { text: `Usage: ${commandPrefix}addpremium <user_number> <creator_code> <added_by_number> [duration_days (default: 30)]` }, { quoted: message });
        }

        let targetNumber = args[0].replace(/\D/g, '');
        const creatorCodeProvided = args[1];
        let addedByNumber = args[2].replace(/\D/g, '');
        const durationDays = parseInt(args[3]) || 30;

        if (creatorCodeProvided !== process.env.CREATOR_CODE) {
            return await sock.sendMessage(chatId, { text: '❌ *Authentication Failed*\n\nInvalid creator code.' }, { quoted: message });
        }

        if (!targetNumber.startsWith('254') && targetNumber.length === 9) {
            targetNumber = `254${targetNumber}`;
        }

        if (!addedByNumber.startsWith('254') && addedByNumber.length === 9) {
            addedByNumber = `254${addedByNumber}`;
        }

        if (isNaN(durationDays) || durationDays <= 0) {
            return await sock.sendMessage(chatId, { text: '❌ *Invalid Duration*\n\nDuration must be a positive number of days.' }, { quoted: message });
        }

        try {
            const response = await fetch(`${EXTERNAL_API_URL}/premiumadd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: targetNumber,
                    duration: durationDays,
                    creatorCode: creatorCodeProvided,
                    addedBy: addedByNumber,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                const expiryDate = new Date(result.expiry).toLocaleDateString();
                await sock.sendMessage(chatId, { text: `✅ *Premium Added/Updated*\n\nUser *${targetNumber}* now has premium access for *${durationDays} days*, expiring on *${expiryDate}*.` }, { quoted: message });
                logger.info(`Premium added/updated for ${targetNumber} by ${addedByNumber} for ${durationDays} days via API.`);
            } else {
                await sock.sendMessage(chatId, { text: `❌ *API Error*\n\nFailed to add/update premium user: ${result.message || 'Unknown error from API'}` }, { quoted: message });
                logger.error(`API error adding premium for ${targetNumber}: ${result.message || response.statusText}`);
            }
        } catch (error) {
            logger.error(`Error in addpremium command for ${targetNumber}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn error occurred while connecting to the premium service.' }, { quoted: message });
        }
    },
};