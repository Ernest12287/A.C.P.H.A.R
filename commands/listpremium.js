// src/commands/admin/listpremium.js
export default {
    name: 'listpremium',
    aliases: ['premiumlist', 'showpremium'],
    description: 'Lists all premium users and their expiry dates via external API. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: true,
    adminOnly: true,
    category: 'Admin',

    async execute(sock, message, args, logger, { isOwner }) {
        const chatId = message.key.remoteJid;
        const EXTERNAL_API_URL = process.env.EXTERNAL_PREMIUM_API_URL;
        if (!EXTERNAL_API_URL) {
            return await sock.sendMessage(chatId, { text: '❌ *Configuration Error*\n\nEXTERNAL_PREMIUM_API_URL is not set in .env. Premium commands cannot be used.' }, { quoted: message });
        }

        if (!isOwner) {
            return await sock.sendMessage(chatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }

        try {
            const response = await fetch(`${EXTERNAL_API_URL}/premiumlist`);
            const data = await response.json();

            if (!response.ok) {
                return await sock.sendMessage(chatId, { text: `❌ *API Error*\n\nFailed to fetch premium list: ${data.message || 'Unknown error from API'}` }, { quoted: message });
            }

            const premiumUsers = data.users; // Extract the array from the 'users' key

            if (!Array.isArray(premiumUsers) || premiumUsers.length === 0) {
                return await sock.sendMessage(chatId, { text: 'ℹ️ *Premium Users*\n\nNo premium users found.' }, { quoted: message });
            }

            let responseText = '🌟 *ACEPHAR Premium Users* 🌟\n\n';
            premiumUsers.forEach((user, index) => {
                const expiryDate = new Date(user.expiry);
                const isActive = expiryDate > Date.now();
                const status = isActive ? '✅ Active' : '❌ Expired';
                const expiryString = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

                responseText += `${index + 1}. *User:* ${user.number}\n`;
                responseText += `   *Status:* ${status}\n`;
                responseText += `   *Expires:* ${expiryString}\n`;
                if (user.addedBy) {
                    responseText += `   *Added By:* ${user.addedBy}\n`;
                }
                if (user.addedAt) {
                    responseText += `   *Added At:* ${new Date(user.addedAt).toLocaleDateString()} ${new Date(user.addedAt).toLocaleTimeString()}\n\n`;
                } else {
                    responseText += '\n';
                }
            });

            await sock.sendMessage(chatId, { text: responseText.trim() }, { quoted: message });
            logger.info(`Listed premium users for ${chatId} via API.`);

        } catch (error) {
            logger.error('Error listing premium users:', error);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn error occurred while connecting to the premium service.' }, { quoted: message });
        }
    },
};