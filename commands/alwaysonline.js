// src/commands/owner/alwaysonline.js

export default {
    name: 'alwaysonline',
    description: 'Toggles the bot\'s "always online" presence.',
    category: 'user',
    usage: 'alwaysonline <on|off>',
    ownerOnly: true,

    async execute(sock, message, args, logger, { botState }) {
        const chatId = message.key.remoteJid;
        const [action] = args;
        const normalizedAction = action?.toLowerCase();

        if (normalizedAction === 'on') {
            if (botState.isAlwaysOnline) {
                await sock.sendMessage(chatId, { text: '✨ Bot is already set to always online.' }, { quoted: message });
            } else {
                botState.isAlwaysOnline = true;
                await sock.sendMessage(chatId, { text: '✅ Bot presence set to always online.' }, { quoted: message });
                logger.info('Always online mode enabled.');
            }
        } else if (normalizedAction === 'off') {
            if (!botState.isAlwaysOnline) {
                await sock.sendMessage(chatId, { text: '❌ Bot is not in always online mode.' }, { quoted: message });
            } else {
                botState.isAlwaysOnline = false;
                await sock.sendMessage(chatId, { text: '⛔ Always online mode disabled.' }, { quoted: message });
                logger.info('Always online mode disabled.');
            }
        } else {
            await sock.sendMessage(chatId, { text: '⚠️ Invalid action. Use `alwaysonline on` or `alwaysonline off`.' }, { quoted: message });
        }
    }
};
