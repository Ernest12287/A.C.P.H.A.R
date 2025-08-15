// src/commands/owner/private.js

export default {
    name: 'private',
    aliases: ['pmode'],
    description: 'Toggles private mode for the bot (Owner Only).',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    ownerOnly: true,
    category: 'user',

    async execute(sock, message, args, logger, context) {
        const from = message.key.remoteJid;
        const [action] = args;

        if (action === 'on') {
            context.botState.isPrivateMode = true;
            await sock.sendMessage(from, { text: '✅ Private mode is now *ON*. I will now only respond to the owner in private chats.' }, { quoted: message });
        } else if (action === 'off') {
            context.botState.isPrivateMode = false;
            await sock.sendMessage(from, { text: '✅ Private mode is now *OFF*. I will respond to commands from anywhere.' }, { quoted: message });
        } else {
            await sock.sendMessage(from, { text: '⚠️ Invalid usage. Use `private on` or `private off`.' }, { quoted: message });
        }
    }
};
