import { isOwner, sendError } from '../lib/utils.js';

let cooldownExecute = 0;

export default {
    name: 'execute',
    aliases: [],

    description: 'Executes remote code (owner only)',
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
        if (currentTime - cooldownExecute < 5000) 
            return await sendError(sock, from, `Please wait before using this command again.`);

        if (!args.length) 
            return await sendError(sock, from, 'Provide code to execute.');

        try {
            let result = eval(args.join(' '));
            if (typeof result !== 'string') result = JSON.stringify(result, null, 2);
            await sock.sendMessage(from, { text: `Result:\n${result}` });
            cooldownExecute = currentTime;
        } catch (error) {
            await sendError(sock, from, `Execution failed:\n${error.message}`);
        }
    }
};