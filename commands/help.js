// src/commands/help.js
export default {
    name: 'help',
    aliases: [],
    description: 'Lists all available commands.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'General',

    async execute(sock, message, args, logger, context) {
        try {
            const commandMap = context.commandMap;
            const botPrefix = context.commandPrefix;

            let helpText = `*📚 All Available Commands*\n\n`;
            const commandList = Object.keys(commandMap).map(cmd => `\`${botPrefix}${cmd}\``).join(', ');

            helpText += commandList;
            helpText += `\n\n_Type \`${botPrefix}menu\` for more details and bot info._`;

            await sock.sendMessage(
                message.key.remoteJid, {
                    text: helpText
                }, {
                    quoted: message
                }
            );

        } catch (error) {
            logger.error('Error executing help command:', error);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ An error occurred while listing commands.'
            }, {
                quoted: message
            });
        }
    },
};