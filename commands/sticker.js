// src/commands/utility/sticker.js
import baileys from 'baileys-x'; // Import the default export (the entire package)
const { downloadContentFromMessage } = baileys; // Destructure the specific function
import { createSticker } from '../utils/mediaUtils.js';

export default {
    name: 'sticker',
    aliases: ['s', 'stiker'],
    description: 'Converts an image or video to a WhatsApp sticker. Reply to an image/video or send with caption.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the sticker command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        let mediaType = null;
        let mediaMessage = null;

        // Check if the command is a reply to an image or video
        if (quotedMessage) {
            if (quotedMessage.imageMessage) {
                mediaType = 'imageMessage';
                mediaMessage = quotedMessage.imageMessage;
            } else if (quotedMessage.videoMessage) {
                mediaType = 'videoMessage';
                mediaMessage = quotedMessage.videoMessage;
            }
        }
        // Check if the message itself is an image or video with caption
        else if (message.message?.imageMessage) {
            mediaType = 'imageMessage';
            mediaMessage = message.message.imageMessage;
        } else if (message.message?.videoMessage) {
            mediaType = 'videoMessage';
            mediaMessage = message.message.videoMessage;
        }

        if (!mediaType) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nReply to an image or video, or send an image/video with the caption \`${context.commandPrefix}sticker\` to create a sticker.` }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: '🔄 Creating sticker, please wait...' }, { quoted: message });

            // Use the destructured downloadContentFromMessage
            const stream = await downloadContentFromMessage(mediaMessage, mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const stickerBuffer = await createSticker(buffer, mediaMessage.mimetype);

            await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: message });
            logger.info(`Sticker created and sent for ${chatId}.`);

        } catch (error) {
            logger.error(`Error creating sticker for ${chatId}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *Sticker Error*\n\nFailed to create sticker. Ensure the media is valid and try again.' }, { quoted: message });
        }
    },
};