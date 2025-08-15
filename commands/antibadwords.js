// src/commands/group/antibadwords.js

import { groupSettings, saveGroupSettings, initGroupSettings, isSenderAdmin } from '../utils/grouputils.js';
import { isJidGroup } from "baileys-x";

export default {
    name: 'antibadwords',
    aliases: ['antibad'],
    description: 'Manages the bad words filter in a group (Admin Only).',
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

        const [subCommand, ...restArgs] = args;
        initGroupSettings(from);

        switch (subCommand) {
            case 'on':
                groupSettings[from].antibad = true;
                await sock.sendMessage(from, { text: '✅ Anti-badwords is now active. Inappropriate language from non-admins will be deleted.' }, { quoted: message });
                break;
            case 'off':
                groupSettings[from].antibad = false;
                await sock.sendMessage(from, { text: '❌ Anti-badwords is now deactivated.' }, { quoted: message });
                break;
            case 'add':
                const newWord = restArgs.join(' ').toLowerCase();
                if (!newWord) {
                    await sock.sendMessage(from, { text: '⚠️ Invalid usage. Use `antibadwords add <word>`.' }, { quoted: message });
                    return;
                }
                if (groupSettings[from].badwords.includes(newWord)) {
                    await sock.sendMessage(from, { text: `⚠️ The word "${newWord}" is already on the bad words list.` }, { quoted: message });
                } else {
                    groupSettings[from].badwords.push(newWord);
                    await sock.sendMessage(from, { text: `✅ The word "${newWord}" has been added to the bad words list.` }, { quoted: message });
                }
                break;
            case 'del':
                const wordToDelete = restArgs.join(' ').toLowerCase();
                if (!wordToDelete) {
                    await sock.sendMessage(from, { text: '⚠️ Invalid usage. Use `antibadwords del <word>`.' }, { quoted: message });
                    return;
                }
                const index = groupSettings[from].badwords.indexOf(wordToDelete);
                if (index > -1) {
                    groupSettings[from].badwords.splice(index, 1);
                    await sock.sendMessage(from, { text: `✅ The word "${wordToDelete}" has been removed from the bad words list.` }, { quoted: message });
                } else {
                    await sock.sendMessage(from, { text: `⚠️ The word "${wordToDelete}" was not found on the bad words list.` }, { quoted: message });
                }
                break;
            default:
                await sock.sendMessage(from, { text: '⚠️ Invalid antibadwords command. Use `on`, `off`, `add`, or `del`.' }, { quoted: message });
                break;
        }

        saveGroupSettings();
    }
};
