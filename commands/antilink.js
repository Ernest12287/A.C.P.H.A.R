// src/commands/group/antilink.js


import { groupSettings, saveGroupSettings, initGroupSettings, isSenderAdmin } from '../utils/grouputils.js';
import { isJidGroup } from "baileys-x";

export default {
    name: 'antilink',
    aliases: ['linkdel', 'linkwarn'],
    description: 'Toggles link moderation in a group (Admin Only).',
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
            groupSettings[from].antilink = true;
            groupSettings[from].antilinkWarn = false;
            await sock.sendMessage(from, { text: '✅ Anti-link is now active. Links from non-admins will be deleted.' }, { quoted: message });
        } else if (status === 'warn') {
            groupSettings[from].antilink = true;
            groupSettings[from].antilinkWarn = true;
            await sock.sendMessage(from, { text: '✅ Anti-link is now active in warn mode. Links from non-admins will be deleted and they will be warned.' }, { quoted: message });
        } else if (status === 'off') {
            groupSettings[from].antilink = false;
            groupSettings[from].antilinkWarn = false;
            await sock.sendMessage(from, { text: '❌ Anti-link is now deactivated.' }, { quoted: message });
        } else {
            await sock.sendMessage(from, { text: '⚠️ Invalid usage. Use `antilink <on/off/warn>`.' }, { quoted: message });
        }

        saveGroupSettings();
    }
};
