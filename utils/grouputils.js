// src/commands/group/groupSettings.js

import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

// A simple in-memory store for group settings.
const groupSettings = {};

// Function to save settings to a JSON file.
export function saveGroupSettings() {
    try {
        writeFileSync(join(process.cwd(), 'groupSettings.json'), JSON.stringify(groupSettings, null, 2));
        console.log("Group settings saved successfully.");
    } catch (e) {
        console.error('Failed to save group settings:', e);
    }
}

// Function to load settings from a JSON file on startup.
export function loadGroupSettings() {
    const settingsPath = join(process.cwd(), 'groupSettings.json');
    if (existsSync(settingsPath)) {
        try {
            const data = readFileSync(settingsPath, 'utf-8');
            Object.assign(groupSettings, JSON.parse(data));
            console.log("Group settings loaded successfully.");
        } catch (e) {
            console.error('Failed to load group settings:', e);
        }
    }
}

// Check and initialize settings for a new group if needed.
export function initGroupSettings(chatId) {
    if (!groupSettings[chatId]) {
        groupSettings[chatId] = {
            antilink: false,
            antilinkWarn: false,
            antibot: false,
            antimention: false,
            antimedia: false,
            antisticker: false,
            antinsfw: false,
            antibad: false, // Renamed from antibadwords
            badwords: [],
            antimenu: false,
        };
    }
}

// Helper function to check if a user is a group admin.
export async function isSenderAdmin(sock, chatId, senderJid) {
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const adminJids = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id);
        return adminJids.includes(senderJid);
    } catch (error) {
        console.error('Error checking for admin status:', error);
        return false;
    }
}

// Load settings once when the bot starts.
loadGroupSettings();

// Export the settings object for use in other command files.
export { groupSettings };
