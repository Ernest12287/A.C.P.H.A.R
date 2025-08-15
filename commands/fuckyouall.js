import { isOwner, sendError } from '../lib/utils.js';
;

let cooldownRapid = 0;

export default {
    name: 'fuckyouall',
    aliases: [],
    description: 'Send rapid ping spam to target (owner only)',
    
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
        if (currentTime - cooldownRapid < 5000) 
            return await sendError(sock, from, `Please wait before using this command again.`);

        const phoneNumber = args[0]?.replace(/\D/g, '');
        if (!phoneNumber || phoneNumber.length < 10) 
            return await sendError(sock, from, `Provide a valid phone number (e.g., !fuckyouall 254722233xxx).`);

        const targetJid = `${phoneNumber}@s.whatsapp.net`;
        const cmdCount = parseInt(args[1]) || 10;

        try {
            for (let i = 0; i < cmdCount; i++) {
                const start = Date.now();
                await sock.sendMessage(targetJid, { text: 'Pong!' });
                const end = Date.now();
                await sock.sendMessage(targetJid, { text: `Ping ${i + 1}/${cmdCount}: ${end - start}ms` });
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            await sock.sendMessage(from, { text: `Sent ${cmdCount} pings to ${phoneNumber} ✅` });
            cooldownRapid = currentTime;
        } catch (error) {
            await sendError(sock, from, 'Rapid ping test failed.');
        }
    }
};