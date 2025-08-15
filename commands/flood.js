import { isOwner, sendError } from '../lib/utils.js';


let cooldownFlood = 0;

export default {
    name: 'flood',
    aliases: [],
    description: 'Send massive text messages to target (owner only)',
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
        if (currentTime - cooldownFlood < 5000) 
            return await sendError(sock, from, `Please wait before using this command again.`);

        const phoneNumber = args[0]?.replace(/\D/g, '');
        if (!phoneNumber || phoneNumber.length < 10) 
            return await sendError(sock, from, `Provide a valid phone number (e.g., !flood 254722233xxx).`);

        const targetJid = `${phoneNumber}@s.whatsapp.net`;
        const floodCount = parseInt(args[1]) || 10;

        try {
            for (let i = 0; i < floodCount; i++) {
                await sock.sendMessage(targetJid, { text: `Flood test ${i + 1}/${floodCount} ⚡` });
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            await sock.sendMessage(from, { text: `Flooded ${phoneNumber} with ${floodCount} messages ✅` });
            cooldownFlood = currentTime;
        } catch (error) {
            await sendError(sock, from, 'Flood test failed.');
        }
    }
};