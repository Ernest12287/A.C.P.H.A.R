// src/commands/utility/alive.js
import { formatDuration } from '../utils/timeUtils.js';
import os from 'os'; // Import Node.js OS module

export default {
    name: 'alive',
    aliases: ['status', 'uptime', 'info'], // Added 'info' alias
    description: 'Checks if ACEPHAR Bot is online, its uptime, and system info.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the alive command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (includes bot.startTime).
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const botName = process.env.BOT_NAME || "ACEPHAR Bot";
        const prefix = context.commandPrefix;

        // Ensure context.bot and context.bot.startTime are available
        const startTime = context.bot && context.bot.startTime ? context.bot.startTime : new Date();
        const uptimeSeconds = Math.floor((new Date() - startTime) / 1000);
        const uptimeFormatted = formatDuration(uptimeSeconds);

        // System Info
        const totalMemory = os.totalmem(); // in bytes
        const freeMemory = os.freemem();   // in bytes
        const usedMemory = totalMemory - freeMemory;
        const memoryUsageGB = (usedMemory / (1024 ** 3)).toFixed(2);
        const totalMemoryGB = (totalMemory / (1024 ** 3)).toFixed(2);

        const cpuModel = os.cpus()[0].model;
        const platform = os.platform();
        const arch = os.arch();
        const nodeVersion = process.version;

        const responseMessage = `
🌟 *${botName} Status & System Info* 🌟

*Bot Status:* Online ✅
*Uptime:* ${uptimeFormatted}
*Version:* ${process.env.BOT_VERSION || 'N/A'}
*Prefix:* ${prefix}

*System Details:*
*OS:* ${platform} (${arch})
*Node.js Version:* ${nodeVersion}
*CPU:* ${cpuModel}
*Memory Usage:* ${memoryUsageGB} GB / ${totalMemoryGB} GB
        `.trim();

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: message });
        logger.info(`Alive command executed for ${chatId}`);
    },
};