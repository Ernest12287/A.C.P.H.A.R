// src/commands/user/autostatus.js

// The command object to be exported.
export default {
    name: 'autostatus',
    description: 'Toggles the auto status viewing and liking feature. When on, the bot will automatically view and like all statuses.',
    category: 'user',
    usage: 'autostatus <on|off>',
    aliases: ['as', 'autoview'],
    ownerOnly: true,
    // The core execution logic for the command.
    async execute(sock, message, args, logger, { botState }) {
        const chatId = message.key.remoteJid;
        const [action] = args;

        if (!action) {
            const status = botState.isAutoStatusViewEnabled ? '✅ ON' : '❌ OFF';
            await sock.sendMessage(chatId, { text: `Auto status viewing is currently ${status}. Use \`autostatus on\` or \`autostatus off\` to change.` }, { quoted: message });
            return;
        }

        const normalizedAction = action.toLowerCase();
        
        // Handle 'on' action
        if (normalizedAction === 'on') {
            if (botState.isAutoStatusViewEnabled) {
                await sock.sendMessage(chatId, { text: '✨ Auto status viewing is already enabled.' }, { quoted: message });
            } else {
                botState.isAutoStatusViewEnabled = true;
                await sock.sendMessage(chatId, { text: '✅ Auto status viewing has been enabled. The bot will now automatically view and like new statuses.' }, { quoted: message });
            }
        } 
        // Handle 'off' action
        else if (normalizedAction === 'off') {
            if (!botState.isAutoStatusViewEnabled) {
                await sock.sendMessage(chatId, { text: '❌ Auto status viewing is already disabled.' }, { quoted: message });
            } else {
                botState.isAutoStatusViewEnabled = false;
                await sock.sendMessage(chatId, { text: '⛔ Auto status viewing has been disabled.' }, { quoted: message });
            }
        } 
        // Handle invalid action
        else {
            await sock.sendMessage(chatId, { text: '⚠️ Invalid action. Please use `autostatus on` or `autostatus off`.' }, { quoted: message });
        }
    }
};
