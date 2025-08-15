// src/commands/group/antimention.js


import { groupSettings, saveGroupSettings, initGroupSettings, isSenderAdmin } from '../utils/grouputils.js';
import { isJidGroup } from "baileys-x";

export default {
    name: 'antimention',
    aliases: ['antitag'],
    description: 'Toggles the anti-mention-all filter in a group (Admin Only).',
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: false,
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
            groupSettings[from].antimention = true;
            await sock.sendMessage(from, { text: '✅ Anti-mention is now active. Messages mentioning everyone will be deleted.' }, { quoted: message });
        } else if (status === 'off') {
            groupSettings[from].antimention = false;
            await sock.sendMessage(from, { text: '❌ Anti-mention is now deactivated.' }, { quoted: message });
        } else {
            await sock.sendMessage(from, { text: '⚠️ Invalid usage. Use `antimention <on/off>`.' }, { quoted: message });
        }

        saveGroupSettings();
    }
};
