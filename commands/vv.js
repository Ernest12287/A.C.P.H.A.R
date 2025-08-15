import pkg from "baileys-x";
const {
    downloadContentFromMessage,
} = pkg;
import fs from "fs/promises";
import path from "path";

export default {
    name: "vv",
    aliases: [],
    ispremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Tools',

    async execute(sock, m, args) { // Using 'm' for message for clarity, as is common
        try {
            console.log("starting steal view once command ");

            // Correctly access the quoted message from the 'm' object
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                return await sock.sendMessage(m.key.remoteJid, { text: "You have not replied to any image or video please do so for the command to do its desired function" }, { quoted: m });
            }

            let mediaToDownload = null;
            let mediaType = null;

            // Refined logic to check for direct media and viewOnce media
            if (quoted.imageMessage) {
                mediaToDownload = quoted.imageMessage;
                mediaType = "image";
            } else if (quoted.videoMessage) {
                mediaToDownload = quoted.videoMessage;
                mediaType = "video";
            } else if (quoted.viewOnceMessageV2) {
                const viewOnceContent = quoted.viewOnceMessageV2.message;
                if (viewOnceContent?.imageMessage) {
                    mediaToDownload = viewOnceContent.imageMessage;
                    mediaType = 'image';
                } else if (viewOnceContent?.videoMessage) {
                    mediaToDownload = viewOnceContent.videoMessage;
                    mediaType = 'video';
                }
            }

            if (!mediaToDownload || !mediaType) {
                console.log(`DEBUG: Quoted message type not recognized for media download. Keys: ${Object.keys(quoted)}`);
                return await sock.sendMessage(m.key.remoteJid, { text: "The replied message does not contain a supported image or video." }, { quoted: m });
            }

            console.log(`DEBUG: Attempting to download ${mediaType}.`);
            const stream = await downloadContentFromMessage(mediaToDownload, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (buffer.length === 0) {
                console.log("DEBUG: Downloaded buffer is empty.");
                return await sock.sendMessage(m.key.remoteJid, { text: "Failed to download the media content." }, { quoted: m });
            }

            const ext = mediaType === 'image' ? 'jpg' : 'mp4';
            const filename = `stolen_media_${m.key.id}.${ext}`;
            const tempDir = path.join(process.cwd(), 'temp');
            const filePath = path.join(tempDir, filename);

            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, buffer);

            console.log(`DEBUG: Downloaded and saved as ${filename}`);

            // Generate the dynamic caption for ACEPHAR
            let captionText = "";
            if (mediaType === 'image') {
                captionText = "📸 ACEPHAR has successfully gotten your image!";
            } else if (mediaType === 'video') {
                captionText = "🎥 ACEPHAR has successfully gotten your video!";
            } else {
                captionText = "ACEPHAR has successfully gotten your media!";
            }

            // Send the media back with the dynamic caption
            if (mediaType === 'image') {
                await sock.sendMessage(m.key.remoteJid, { image: { url: filePath }, caption: captionText }, { quoted: m });
            } else if (mediaType === 'video') {
                await sock.sendMessage(m.key.remoteJid, { video: { url: filePath }, caption: captionText }, { quoted: m });
            }

            await fs.unlink(filePath); // Clean up temp file
            console.log(`DEBUG: Deleted temporary file ${filePath}`);

        } catch (err) {
            console.error("❌ Error in stealViewOnce:", err);
            console.error("❌ Error stack:", err.stack);
            await sock.sendMessage(m.key.remoteJid, { text: `An error occurred while trying to steal the media: ${err.message}` }, { quoted: m });
        }
    },
};