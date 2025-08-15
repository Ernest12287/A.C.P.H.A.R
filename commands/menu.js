// src/commands/menu.js
import os from 'os';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// A placeholder for `commandMap` - the real one is loaded from the handler
// We will need to import it properly in the main handler file
// import { commandMap } from '../handlers/messageHandler.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to format uptime
const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

export default {
    name: 'menu',
    aliases: ['help', 'start', 'commands'],
    description: 'Displays the list of all available commands.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'General',

    /**
     * Executes the menu command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        try {
            const botName = "ACEPHAR";
            const botCreator = "Ernest Tech House";
            const botPrefix = context.commandPrefix;
            const isGroup = context.isGroup;
            const senderJid = context.senderJid;
            const totalCommands = Object.keys(context.commandMap).length;
            const uptime = formatUptime(process.uptime());
            const osArch = os.arch();
            const osType = os.type();
            const version = process.version;
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const botOwnerNumber = process.env.OWNER_NUMBER;

            const commandMap = context.commandMap;

            // Group commands by category
            const categorizedCommands = {};
            for (const name in commandMap) {
                const command = commandMap[name];
                const category = command.category || 'Uncategorized';
                if (!categorizedCommands[category]) {
                    categorizedCommands[category] = [];
                }
                categorizedCommands[category].push(name);
            }

            // Build the menu message text
            let menuText = `*Hey ${message.pushName || 'User'}! I'm ${botName}.* 👋\n\n`;
            menuText += `*🤖 Bot Information*\n`;
            menuText += `> Creator: ${botCreator}\n`;
            menuText += `> Owner: wa.me/${botOwnerNumber}\n`;
            menuText += `> Mode: ${isGroup ? 'Group Chat' : 'Private Chat'}\n`;
            menuText += `> Prefix: \`${botPrefix}\`\n`;
            menuText += `> Total Commands: ${totalCommands}\n`;
            menuText += `> OS: ${osType} (${osArch})\n`;
            menuText += `> Uptime: ${uptime}\n`;
            menuText += `> Timezone: ${timeZone}\n`;
            menuText += `> Node.js Version: ${version}\n\n`;

            menuText += `*📁 Commands by Category*\n`;

            for (const category in categorizedCommands) {
                const commandsList = categorizedCommands[category].map(cmd => `\`${botPrefix}${cmd}\``).join(', ');
                menuText += `> *${category}*:\n`;
                menuText += `  ${commandsList}\n\n`;
            }

            menuText += `_Type \`${botPrefix}help\` for a simplified list of commands._\n`;

            const imagePath = path.join(__dirname, '../profile.jpg');
            const menuImageBuffer = readFileSync(imagePath);

            await sock.sendMessage(
                message.key.remoteJid, {
                    image: menuImageBuffer,
                    caption: menuText,
                    mimetype: 'image/jpeg'
                }, {
                    quoted: message
                }
            );

        } catch (error) {
            logger.error('Error executing menu command:', error);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ An error occurred while generating the menu. Please try again.'
            }, {
                quoted: message
            });
        }
    },
};