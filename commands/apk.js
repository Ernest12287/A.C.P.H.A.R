// src/commands/tools/apk.js
import axios from 'axios';

export default {
    name: 'apk',
    aliases: [],
    description: 'Finds and provides direct download links for APKs. (API status dependent)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Tools', // New category

    /**
     * Executes the apk command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (app name).
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const appName = args.join(' ').trim();

        if (!appName) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide an app name to search for. Example: \`${context.commandPrefix}apk whatsapp\`` }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: `🔎 Searching for "${appName}" APK...` }, { quoted: message });

        try {
            // Note: User reported this API might be inactive. If it fails, an alternative is needed.
            const apiUrl = `https://apis.davidcyriltech.my.id/download/apk?text=${encodeURIComponent(appName)}`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (data.success && data.download_link) {
                const formattedResponse = `
📱 *APK Found!* 📱

*App Name:* ${data.apk_name || appName}
*Thumbnail:* ${data.thumbnail || 'N/A'}
*Download Link:* ${data.download_link}

_Creator: pease ernest_
                `.trim();
                await sock.sendMessage(chatId, { text: formattedResponse }, { quoted: message });
                logger.info(`APK found for "${appName}" and sent to ${chatId}.`);

                // Optionally send thumbnail as image if available and valid URL
                if (data.thumbnail && data.thumbnail.startsWith('http')) {
                    try {
                        await sock.sendMessage(chatId, { image: { url: data.thumbnail }, caption: `Thumbnail for ${data.apk_name || appName}` }, { quoted: message });
                    } catch (thumbError) {
                        logger.warn(`Failed to send APK thumbnail for ${appName}: ${thumbError.message}`);
                    }
                }

            } else {
                await sock.sendMessage(chatId, { text: `❌ *APK Search Error*\n\nCould not find APK for "*${appName}*". Please try a different name or check spelling.` }, { quoted: message });
                logger.warn(`APK search for "${appName}" failed: ${data.message || 'No download link found.'}`);
            }
        } catch (error) {
            logger.error(`Error in !apk command for "${appName}":`, error?.response?.data || error.message);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn error occurred while trying to find the APK. The service might be temporarily unavailable.' }, { quoted: message });
        }
    },
};