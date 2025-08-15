import { WAMessageStubType, downloadContentFromMessage } from 'baileys-x';
import fs from 'fs/promises';
import path from 'path';

export default {
    name: 'pp',
    aliases: ['profile', 'pp'],
    description: 'Sets the bot\'s profile picture. Reply to an image.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false, // We will use a manual check instead of this flag
    category: 'user',

    /**
     * Executes the pp command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;
        
        // --- START OWNER CHECK ---
        // IMPORTANT: Replace '1234567890@s.whatsapp.net' with the bot owner's JID
        const ownerJid = '1234567890@s.whatsapp.net'; 
        const senderJid = msg.key.participant || from;

        if (senderJid !== ownerJid) {
            console.log("❌ Unauthorized access attempt to pp command.");
            return await sock.sendMessage(from, {
                text: "🚫 This command can only be used by the bot owner."
            }, { quoted: msg });
        }
        // --- END OWNER CHECK ---
        
        try {
            console.log("🔍 Attempting to set profile picture...");

            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                console.log("❌ No message quoted.");
                return await sock.sendMessage(from, {
                    text: "❌ *Please reply to an image message* to set it as the profile picture.",
                }, { quoted: msg });
            }

            if (!quoted.imageMessage) {
                console.log("❌ Quoted message is not an image.");
                return await sock.sendMessage(from, {
                    text: "❌ *The replied message is not an image.* Please reply to an image.",
                }, { quoted: msg });
            }

            const imageMessage = quoted.imageMessage;

            // Download the image buffer using downloadContentFromMessage
            console.log("⬇️ Downloading image for profile picture...");
            const stream = await downloadContentFromMessage(imageMessage, 'image'); // 'image' for image type
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer || buffer.length === 0) {
                console.log("❌ Failed to download image buffer.");
                return await sock.sendMessage(from, {
                    text: "❌ Failed to download the image. It might be corrupted or expired.",
                }, { quoted: msg });
            }

            const botJid = sock.user.id;

            console.log(`📸 Setting profile picture for ${botJid}...`);
            await sock.updateProfilePicture(botJid, buffer);

            console.log("✅ Profile picture updated successfully!");
            await sock.sendMessage(from, {
                text: "✅ Profile picture updated successfully!",
            }, { quoted: msg });

        } catch (err) {
            console.error("❌ Error in setProfilePicture command:", err);
            console.error("❌ Error stack:", err.stack);

            let errorMessage = "🚫 *Failed to set profile picture due to an unexpected error.*";
            if (err.message.includes("Failed to download")) {
                errorMessage = "❌ *Failed to download the image.* It might be too large or invalid.";
            } else if (err.message.includes("Invalid image")) {
                errorMessage = "❌ *The image provided is invalid or too large.*";
            }

            await sock.sendMessage(from, {
                text: errorMessage,
            }, { quoted: msg });
        }
    },
};
