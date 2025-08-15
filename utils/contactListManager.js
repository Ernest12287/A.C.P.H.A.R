// src/utils/contactListManager.js
import fs from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data'); // Points to src/data
const CONTACT_LISTS_FILE = join(DATA_DIR, 'contact_lists.json');

/**
 * Ensures the data directory exists.
 */
async function ensureDataDirectory() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error ensuring data directory for contact lists:', error);
    }
}

/**
 * Loads all contact lists from the JSON file.
 * @returns {Promise<object>} A map of owner JIDs to their contact lists.
 */
export async function loadContactLists() {
    await ensureDataDirectory();
    try {
        const data = await fs.readFile(CONTACT_LISTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File does not exist, return empty object
            return {};
        }
        console.error('Error loading contact lists:', error);
        return {}; // Return empty on other errors too
    }
}

/**
 * Saves all contact lists to the JSON file.
 * @param {object} contactLists - The object containing all contact lists.
 */
export async function saveContactLists(contactLists) {
    await ensureDataDirectory();
    try {
        await fs.writeFile(CONTACT_LISTS_FILE, JSON.stringify(contactLists, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving contact lists:', error);
    }
}

/**
 * Gets contact lists for a specific owner.
 * @param {string} ownerJid - The JID of the bot owner.
 * @returns {Promise<object>} An object containing lists for that owner.
 */
export async function getOwnerContactLists(ownerJid) {
    const allLists = await loadContactLists();
    return allLists[ownerJid] || {};
}

/**
 * Sets (adds or updates) a contact list for a specific owner.
 * @param {string} ownerJid - The JID of the bot owner.
 * @param {string} listName - The name of the contact list.
 * @param {string[]} contacts - An array of contact JIDs.
 */
export async function setOwnerContactList(ownerJid, listName, contacts) {
    const allLists = await loadContactLists();
    if (!allLists[ownerJid]) {
        allLists[ownerJid] = {};
    }
    allLists[ownerJid][listName] = contacts;
    await saveContactLists(allLists);
}

/**
 * Deletes a contact list for a specific owner.
 * @param {string} ownerJid - The JID of the bot owner.
 * @param {string} listName - The name of the contact list to delete.
 * @returns {Promise<boolean>} True if deleted, false if not found.
 */
export async function deleteOwnerContactList(ownerJid, listName) {
    const allLists = await loadContactLists();
    if (allLists[ownerJid] && allLists[ownerJid][listName]) {
        delete allLists[ownerJid][listName];
        await saveContactLists(allLists);
        return true;
    }
    return false;
}