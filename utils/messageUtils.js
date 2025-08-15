// src/utils/messageUtils.js

import { jidNormalizedUser } from 'baileys-x';

/**
 * Extracts the text from a message object, handling different message types.
 * @param {import('@adiwajshing/baileys-x').proto.IWebMessageInfo} message The message object.
 * @returns {string} The text content of the message, or an empty string if not found.
 */
export function getMessageText(message) {
    if (message.message?.conversation) {
        return message.message.conversation;
    }
    if (message.message?.extendedTextMessage?.text) {
        return message.message.extendedTextMessage.text;
    }
    if (message.message?.imageMessage?.caption) {
        return message.message.imageMessage.caption;
    }
    if (message.message?.videoMessage?.caption) {
        return message.message.videoMessage.caption;
    }
    return '';
}

/**
 * Normalizes and returns the JID (Jabber ID) of the sender.
 * @param {string} jid The raw JID.
 * @param {import('@adiwajshing/baileys-x').proto.IWebMessageInfo} message The message object.
 * @returns {string} The normalized JID.
 */
export function getJid(jid, message) {
    return message.key.fromMe ? jid : jidNormalizedUser(jid);
}

/**
 * Checks if the message is from a group chat.
 * @param {import('@adiwajshing/baileys-x').proto.IWebMessageInfo} message The message object.
 * @returns {boolean} True if it's a group chat, false otherwise.
 */
export function getGroupData(message) {
    return message.key.remoteJid.endsWith('@g.us');
}
