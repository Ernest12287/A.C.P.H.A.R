// src/commands/group/settings.js


import { groupSettings,  initGroupSettings, isSenderAdmin } from '../utils/grouputils.js';
import { isJidGroup } from "baileys-x";

export default {
    name: 'settings',
    aliases: ['rules'],
    description: 'Displays the current group moderation settings (Admin Only).',
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

        initGroupSettings(from);
        const currentSettings = groupSettings[from];

        let settingsText = `
╭─「 ⚙️ *ɢʀᴏᴜᴘ sᴇᴛᴛɪɴɢs* 」
╰─━─━─━─━─━─━───

*Anti-Link:* ${currentSettings.antilink ? `✅ ON${currentSettings.antilinkWarn ? ' (Warn Mode)' : ''}` : '❌ OFF'}
*Anti-Bot:* ${currentSettings.antibot ? '✅ ON' : '❌ OFF'}
*Anti-Mention:* ${currentSettings.antimention ? '✅ ON' : '❌ OFF'}
*Anti-Media:* ${currentSettings.antimedia ? '✅ ON' : '❌ OFF'}
*Anti-Sticker:* ${currentSettings.antisticker ? '✅ ON' : '❌ OFF'}
*Anti-NSFW:* ${currentSettings.antinsfw ? '✅ ON' : '❌ OFF'}
*Anti-Badwords:* ${currentSettings.antibad ? '✅ ON' : '❌ OFF'}
*Bad Words List:* ${currentSettings.badwords.length > 0 ? currentSettings.badwords.join(', ') : 'None'}
*Anti-Menu:* ${currentSettings.antimenu ? '✅ ON' : '❌ OFF'}
`;
        await sock.sendMessage(from, { text: settingsText }, { quoted: message });
    }
};
