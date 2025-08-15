// src/commands/utility/toimage.js
import baileys from 'baileys-x'; // Import the default export (the entire package)
const { downloadContentFromMessage } = baileys; // Destructure the specific function
import { convertWebpToJpeg } from '../utils/mediaUtils.js';

export default {
    name: 'toimage',
    aliases: ['toimg', 'img'],
    description: 'Converts a WhatsApp sticker back to an image (JPEG). Reply to a sticker.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the toimage command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quotedMessage || !quotedMessage.stickerMessage) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nReply to a *sticker* message with \`${context.commandPrefix}toimage\` to convert it to an image.` }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: '🔄 Converting sticker to image, please wait...' }, { quoted: message });

            // Use the destructured downloadContentFromMessage
            const stream = await downloadContentFromMessage(quotedMessage.stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Convert WebP sticker buffer to JPEG image buffer
            const imageBuffer = await convertWebpToJpeg(buffer);

            await sock.sendMessage(chatId, { image: imageBuffer, mimetype: 'image/jpeg' }, { quoted: message });
            logger.info(`Sticker converted to image and sent for ${chatId}.`);

        } catch (error) {
            logger.error(`Error converting sticker to image for ${chatId}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *Conversion Error*\n\nFailed to convert sticker to image. The sticker might be corrupted or unsupported.' }, { quoted: message });
        }
    },
};