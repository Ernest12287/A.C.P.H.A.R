// src/commands/group/antibot.js


import { groupSettings, saveGroupSettings, initGroupSettings, isSenderAdmin } from '../utils/grouputils.js';
import { isJidGroup } from "baileys-x";

export default {
    name: 'antibot',
    aliases: ['botdel'],
    description: 'Toggles the anti-bot filter in a group (Admin Only).',
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: true,
    category: 'Groups',
    ownerOnly: true,
    async execute(sock, message, args, logger) {
        const from = message.key.remoteJid;

        if (!isJidGroup(from)) {
            return await sock.sendMessage(from, { text: '❌ This command can only be used in groups!' }, { quoted: message });
        }

        const isAdmin = await isSenderAdmin(sock, from, message.key.participant);
        if (!isAdmin) {
            return await sock.sendMessage(from, { text: '❌ You must be an admin to use this command.' }, { quoted: message });
        }

        const [status] = args;
        initGroupSettings(from);

        if (status === 'on') {
            groupSettings[from].antibot = true;
            await sock.sendMessage(from, { text: '✅ Anti-bot is now active. Bot responses will be deleted.' }, { quoted: message });
        } else if (status === 'off') {
            groupSettings[from].antibot = false;
            await sock.sendMessage(from, { text: '❌ Anti-bot is now deactivated.' }, { quoted: message });
        } else {
            await sock.sendMessage(from, { text: '⚠️ Invalid usage. Use `antibot <on/off>`.' }, { quoted: message });
        }

        saveGroupSettings();
    }
};
