// src/commands/admin/getblocklist.js

export default {
    name: 'getblocklist',
    aliases: ['blocklist'],
    description: 'Retrieves the bot\'s current block list. (Owner Only)',
    isPremium: false,
    groupOnly: false,
    privateOnly: true, // Best used in private chat
    adminOnly: true, // Restricted to bot owner
    category: 'Admin',

    /**
     * Executes the getblocklist command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (isOwner).
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;

        if (!context.isOwner) {
            return await sock.sendMessage(chatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to the bot owner.' }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: '📋 Fetching bot\'s block list...' }, { quoted: message });
            const blocklist = await sock.fetchBlocklist();

            if (blocklist && blocklist.length > 0) {
                let responseText = '📋 *Bot\'s Block List:*\n\n';
                blocklist.forEach((jid, index) => {
                    responseText += `${index + 1}. \`${jid.split('@')[0]}\`\n`; // Display just the number
                });
                await sock.sendMessage(chatId, { text: responseText.trim() }, { quoted: message });
                logger.info(`Block list sent to owner ${chatId}.`);
            } else {
                await sock.sendMessage(chatId, { text: '✅ *Block List Empty*\n\nThe bot\'s block list is currently empty.' }, { quoted: message });
                logger.info(`Block list is empty for owner ${chatId}.`);
            }
        } catch (error) {
            logger.error('Error fetching block list:', error);
            await sock.sendMessage(chatId, { text: '❌ *Error*\n\nAn error occurred while fetching the block list.' }, { quoted: message });
        }
    },
};