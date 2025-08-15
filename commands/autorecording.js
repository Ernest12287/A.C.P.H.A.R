// src/commands/user/autorecording.js

export default {
    name: 'autorecording',
    description: 'Toggles the bot\'s recording presence. Enabling this will disable auto-typing.',
    category: 'User',
    usage: 'autorecording <on|off>',
    wnerOnly: true,
    
    async execute(sock, message, args, logger, { botState }) {
        const chatId = message.key.remoteJid;
        const [action] = args;
        const normalizedAction = action?.toLowerCase();

        if (normalizedAction === 'on') {
            if (botState.isAutoRecording) {
                await sock.sendMessage(chatId, { text: '✨ Auto-recording is already enabled.' }, { quoted: message });
            } else {
                botState.isAutoRecording = true;
                botState.isAutoTyping = false; // Mutually exclusive with auto-typing
                await sock.sendMessage(chatId, { text: '✅ Auto-recording has been enabled. Auto-typing is now disabled.' }, { quoted: message });
                logger.info('Auto-recording enabled.');
            }
        } else if (normalizedAction === 'off') {
            if (!botState.isAutoRecording) {
                await sock.sendMessage(chatId, { text: '❌ Auto-recording is already disabled.' }, { quoted: message });
            } else {
                botState.isAutoRecording = false;
                await sock.sendMessage(chatId, { text: '⛔ Auto-recording has been disabled.' }, { quoted: message });
                logger.info('Auto-recording disabled.');
            }
        } else {
            await sock.sendMessage(chatId, { text: '⚠️ Invalid action. Use `autorecording on` or `autorecording off`.' }, { quoted: message });
        }
    }
};
