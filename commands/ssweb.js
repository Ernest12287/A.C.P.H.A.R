// src/commands/utility/ssweb.js
import axios from 'axios';
import { URLSearchParams } from 'url'; // Import URLSearchParams for Node.js

// Core screenshot function
async function takeScreenshot(url, device = "desktop") {
    return new Promise((resolve, reject) => {
        const payload = {
            'url': url,
            'device': device,
            'cacheLimit': 0 // Set to 0 to always get a fresh screenshot
        };

        axios({
            'url': "https://www.screenshotmachine.com/capture.php",
            'method': "POST",
            'data': new URLSearchParams(payload), // Use URLSearchParams for x-www-form-urlencoded
            'headers': {
                'content-type': "application/x-www-form-urlencoded; charset=UTF-8"
            }
        }).then(response => {
            const cookies = response.headers["set-cookie"];
            if (response.data.status === "success") {
                axios.get(`https://www.screenshotmachine.com/${response.data.link}`, {
                    'headers': {
                        'cookie': cookies?.join('; ') || '' // Join cookies properly, handle undefined
                    },
                    'responseType': "arraybuffer" // Get response as buffer for image
                }).then(({ data }) => {
                    resolve({
                        'status': 200,
                        'result': data // This is the image buffer
                    });
                }).catch(err => reject({ 'status': err.response?.status || 500, 'message': `Failed to fetch screenshot image: ${err.message}` }));
            } else {
                reject({
                    'status': 404,
                    'message': response.data.error || "Screenshot failed with unknown error from service."
                });
            }
        }).catch(err => reject({ 'status': err.response?.status || 500, 'message': `Screenshot machine API call failed: ${err.message}` }));
    });
}

export default {
    name: 'ssweb',
    aliases: ['screenshot', 'ss'],
    description: 'Takes a screenshot of a given website URL. Usage: !ssweb <url>',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the ssweb command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const url = args[0]?.trim(); // URL is the first argument

        if (!url) {
            return await sock.sendMessage(chatId, {
                text: `📸 *Usage Error*\n\nPlease provide a URL to screenshot. Example: \`${context.commandPrefix}ssweb https://google.com\``
            }, { quoted: message });
        }

        // Add protocol if missing
        const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

        await sock.sendMessage(chatId, { text: '📸 Taking screenshot... This may take a moment.' }, { quoted: message });

        try {
            const screenshot = await takeScreenshot(fullUrl);

            if (screenshot.status === 200 && screenshot.result) {
                await sock.sendMessage(chatId, {
                    image: screenshot.result, // Send the image buffer directly
                    caption: `📸 *Screenshot of:* ${fullUrl}`
                }, { quoted: message });
                logger.info(`Screenshot of ${fullUrl} sent to ${chatId}.`);
            } else {
                await sock.sendMessage(chatId, { text: `❌ *Screenshot Failed*\n\nCould not get a screenshot for "${fullUrl}". Reason: ${screenshot.message || 'Unknown error'}.` }, { quoted: message });
                logger.warn(`Screenshot failed for ${fullUrl}: ${screenshot.message}`);
            }
        } catch (error) {
            logger.error(`Error in !ssweb command for "${fullUrl}":`, error);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn unexpected error occurred while trying to take the screenshot. The service might be temporarily unavailable or the URL is invalid.' }, { quoted: message });
        }
    },
};