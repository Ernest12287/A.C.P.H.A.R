// src/commands/user/autoread.js

export default {
    name: 'autoread',
    description: 'Toggles the auto-read feature. When on, all messages will be marked as read.',
    category: 'user',
    usage: 'autoread <on|off>',
    ownerOnly: true,

    
    async execute(sock, message, args, logger, { botState }) {
        const chatId = message.key.remoteJid;
        const [action] = args;
        const normalizedAction = action?.toLowerCase();

        if (normalizedAction === 'on') {
            if (botState.isAutoRead) {
                await sock.sendMessage(chatId, { text: '✨ Auto-read is already enabled.' }, { quoted: message });
            } else {
                botState.isAutoRead = true;
                await sock.sendMessage(chatId, { text: '✅ Auto-read has been enabled.' }, { quoted: message });
                logger.info('Auto-read enabled.');
            }
        } else if (normalizedAction === 'off') {
            if (!botState.isAutoRead) {
                await sock.sendMessage(chatId, { text: '❌ Auto-read is already disabled.' }, { quoted: message });
            } else {
                botState.isAutoRead = false;
                await sock.sendMessage(chatId, { text: '⛔ Auto-read has been disabled.' }, { quoted: message });
                logger.info('Auto-read disabled.');
            }
        } else {
            await sock.sendMessage(chatId, { text: '⚠️ Invalid action. Use `autoread on` or `autoread off`.' }, { quoted: message });
        }
    }
};
