// src/commands/admin/addstatus.js
import pkg from 'baileys-x';
const { downloadContentFromMessage } = pkg;

export default {
    name: 'addstatus',
    aliases: ['statuspost', 'poststatus'],
    description: 'Posts a text or image status update to the bot\'s WhatsApp profile. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the addstatus command.
     * Usage: !addstatus <your_text>
     * !addstatus <image_url> <caption_text>
     * !addstatus (reply to an image) <caption_text>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (isOwner).
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const senderJid = context.senderJid;

        if (!context.isOwner) {
            return await sock.sendMessage(chatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }

        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const firstArg = args[0]?.trim();
        let statusContent = {}; // Object to hold the content for sendMessage
        let captionText = '';
        let isImageStatus = false;

        // Determine if it's an image status (by reply or URL) or text status
        if (quotedMessage?.imageMessage) {
            // Case 1: Reply to an image
            isImageStatus = true;
            statusContent.image = quotedMessage.imageMessage;
            captionText = args.join(' '); // All args become caption
            logger.debug('AddStatus: Detected image status from reply.');
        } else if (firstArg && (firstArg.startsWith('http://') || firstArg.startsWith('https://')) && /\.(jpeg|jpg|png|gif)$/i.test(firstArg)) {
            // Case 2: Image URL provided as first argument
            isImageStatus = true;
            statusContent.image = { url: firstArg };
            captionText = args.slice(1).join(' '); // Remaining args become caption
            logger.debug(`AddStatus: Detected image status from URL: ${firstArg}`);
        } else if (args.length > 0) {
            // Case 3: Text status
            statusContent.text = args.join(' ');
            logger.debug(`AddStatus: Detected text status: ${statusContent.text}`);
        } else {
            return await sock.sendMessage(chatId, {
                text: `❌ *Usage Error*\n\nPlease provide text for your status, reply to an image, or provide an image URL.
Examples:
\`${context.commandPrefix}addstatus Hello everyone, ACEPHAR is online!\`
\`${context.commandPrefix}addstatus https://example.com/image.jpg This is a cool image!\`
(Reply to an image) \`${context.commandPrefix}addstatus Check out this awesome pic!\``
            }, { quoted: message });
        }

        if (isImageStatus && !statusContent.image) {
            return await sock.sendMessage(chatId, { text: '❌ *Image Error*\n\nCould not process the image for your status. Please ensure it\'s a valid image or URL.' }, { quoted: message });
        }
        if (!isImageStatus && !statusContent.text) {
             return await sock.sendMessage(chatId, { text: '❌ *Content Error*\n\nYour status message cannot be empty.' }, { quoted: message });
        }


        try {
            await sock.sendMessage(chatId, { text: '⬆️ Posting status update...' }, { quoted: message });

            if (isImageStatus) {
                // For images, download if it's a quoted message, otherwise use URL directly
                let mediaData = statusContent.image;
                if (mediaData.stream) { // If it's a quoted message, it will have a stream property
                    const stream = await downloadContentFromMessage(mediaData, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    mediaData = buffer; // Use buffer for sending
                } else if (mediaData.url) {
                    // If it's a URL, Baileys can handle it directly
                    mediaData = { url: mediaData.url };
                } else {
                    throw new Error('Invalid image data for status.');
                }

                await sock.sendMessage(sock.user.id, { // Send to bot's own JID for status
                    image: mediaData,
                    caption: captionText
                }, { broadcast: true }); // Broadcast to status
                logger.info(`Image status posted by owner ${senderJid}. Caption: "${captionText}"`);

            } else {
                // Text status
                await sock.sendMessage(sock.user.id, { // Send to bot's own JID for status
                    text: statusContent.text
                }, { broadcast: true }); // Broadcast to status
                logger.info(`Text status posted by owner ${senderJid}. Content: "${statusContent.text}"`);
            }

            await sock.sendMessage(chatId, { text: '✅ *Success!* Your status has been updated.' }, { quoted: message });

        } catch (error) {
            logger.error(`Error posting status update by ${senderJid}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *Status Update Failed*\n\nAn error occurred while trying to post your status. Please try again.' }, { quoted: message });
        }
    },
};