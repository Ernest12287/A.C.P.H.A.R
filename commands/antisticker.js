// src/commands/group/antisticker.js


import { groupSettings, saveGroupSettings, initGroupSettings, isSenderAdmin } from '../utils/grouputils.js';
import { isJidGroup } from "baileys-x";

export default {
    name: 'antisticker',
    aliases: ['sticker'],
    description: 'Toggles the anti-sticker filter in a group (Admin Only).',
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
            groupSettings[from].antisticker = true;
            await sock.sendMessage(from, { text: '✅ Anti-sticker is now active. Stickers from non-admins will be deleted.' }, { quoted: message });
        } else if (status === 'off') {
            groupSettings[from].antisticker = false;
            await sock.sendMessage(from, { text: '❌ Anti-sticker is now deactivated.' }, { quoted: message });
        } else {
            await sock.sendMessage(from, { text: '⚠️ Invalid usage. Use `antisticker <on/off>`.' }, { quoted: message });
        }

        saveGroupSettings();
    }
};
