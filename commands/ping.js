// src/commands/utility/ping.js

export default {
    name: 'ping',
    aliases: ['latency'],
    description: 'Checks the bot\'s response latency.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility', // Ensure this matches your folder name

    /**
     * Executes the ping command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const startTime = Date.now();

        const sentMessage = await sock.sendMessage(chatId, { text: 'Pinging...' }, { quoted: message });

        const endTime = Date.now();
        const latency = endTime - startTime;

        await sock.sendMessage(chatId, { text: `🏓 Pong! Latency: *${latency}ms*` }, { quoted: sentMessage });
        logger.info(`Ping command executed for ${chatId} with latency ${latency}ms.`);
    },
};