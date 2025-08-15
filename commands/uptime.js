// src/commands/utility/uptime.js

export default {
    name: 'uptime',
    aliases: ['up', 'online'],
    description: 'Displays how long the bot has been running.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the uptime command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context provided by the message handler.
     */
    async execute(sock, message, args, logger, { startTime }) {
        const from = message.key.remoteJid;
        const msg = message;

        try {
            const uptimeString = this.getUptime(startTime);
            
            const replyText = `
╔═════.⏱️.═════╗
  「  ʙᴏᴛ ᴜᴘᴛɪᴍᴇ 」
╚═════.⏱️.═════╝

*I have been online for:*
╭─━─━─━─━─━─━─━─━─
│ *• ᴜᴘᴛɪᴍᴇ:* ${uptimeString}
│ *• sᴛᴀʀᴛᴇᴅ:* ${startTime.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}
╰─━─━─━─━─━─━─━─━─
            `;

            await sock.sendMessage(from, { text: replyText.trim() }, { quoted: msg });
            logger.info(`Sent uptime info to ${from}`);

        } catch (err) {
            logger.error("❌ Error in uptime command:", err);
            await sock.sendMessage(from, { 
                text: `🚫 An error occurred while fetching uptime: ${err.message}` 
            }, { quoted: msg });
        }
    },

    /**
     * Helper function to calculate and format uptime.
     * @param {Date} startTime - The bot's start time.
     * @returns {string} - The formatted uptime string.
     */
    getUptime(startTime) {
        const uptimeMilliseconds = new Date() - startTime;
        const seconds = Math.floor(uptimeMilliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    }
};
