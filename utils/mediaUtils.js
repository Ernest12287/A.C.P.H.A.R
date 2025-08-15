// src/utils/mediaUtils.js
// Ensure NO import for MessageType from 'baileys-x' here
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import sharp from 'sharp';

/**
 * Creates a WhatsApp sticker from an image or video buffer.
 * @param {Buffer} mediaBuffer - The buffer of the image or video.
 * @param {string} mimeType - The MIME type of the media (e.g., 'image/jpeg', 'video/mp4').
 * @param {object} metadata - Optional metadata for the sticker (pack, author).
 * @returns {Promise<Buffer>} The WebP sticker buffer.
 */
export async function createSticker(mediaBuffer, mimeType, metadata = {}) {
    const sticker = new Sticker(mediaBuffer, {
        pack: metadata.pack || 'ACEPHAR Bot', // Default pack name
        author: metadata.author || 'Ernest Tech House', // Default author name
        type: StickerTypes.FULL, // FULL, CROPPED, ROUNDED, CIRCLE
        quality: 100, // Sticker quality (0-100)
        // For animated stickers, you might need to specify a FPS and loop
        // If it's a video, wa-sticker-formatter handles the conversion to GIF/WebP
    });

    return await sticker.toBuffer();
}

/**
 * Converts a WebP sticker buffer back to a JPEG image buffer.
 * @param {Buffer} webpBuffer - The WebP sticker buffer.
 * @returns {Promise<Buffer>} The JPEG image buffer.
 */
export async function convertWebpToJpeg(webpBuffer) {
    // Use sharp to convert WebP to JPEG
    return await sharp(webpBuffer)
        .jpeg({ quality: 90 }) // Adjust quality as needed
        .toBuffer();
}