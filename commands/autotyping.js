// src/commands/user/autotyping.js

export default {
    name: 'autotyping',
    description: 'Toggles the bot\'s typing presence. Enabling this will disable auto-recording.',
    category: 'user',
    usage: 'autotyping <on|off>',
    ownerOnly: true,
    
    async execute(sock, message, args, logger, { botState }) {
        const chatId = message.key.remoteJid;
        const [action] = args;
        const normalizedAction = action?.toLowerCase();

        if (normalizedAction === 'on') {
            if (botState.isAutoTyping) {
                await sock.sendMessage(chatId, { text: '✨ Auto-typing is already enabled.' }, { quoted: message });
            } else {
                botState.isAutoTyping = true;
                botState.isAutoRecording = false; // Mutually exclusive with auto-recording
                await sock.sendMessage(chatId, { text: '✅ Auto-typing has been enabled. Auto-recording is now disabled.' }, { quoted: message });
                logger.info('Auto-typing enabled.');
            }
        } else if (normalizedAction === 'off') {
            if (!botState.isAutoTyping) {
                await sock.sendMessage(chatId, { text: '❌ Auto-typing is already disabled.' }, { quoted: message });
            } else {
                botState.isAutoTyping = false;
                await sock.sendMessage(chatId, { text: '⛔ Auto-typing has been disabled.' }, { quoted: message });
                logger.info('Auto-typing disabled.');
            }
        } else {
            await sock.sendMessage(chatId, { text: '⚠️ Invalid action. Use `autotyping on` or `autotyping off`.' }, { quoted: message });
        }
    }
};
