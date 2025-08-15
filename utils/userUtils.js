// src/utils/userUtils.js

import { getJid, getGroupData } from './messageUtils.js';

/**
 * Extracts and returns key information about the sender of a message.
 * @param {import('@adiwajshing/baileys-x').proto.IWebMessageInfo} message The message object.
 * @returns {{senderJid: string, isGroup: boolean}} An object containing the sender's JID and if it's a group chat.
 */
export function getSenderInfo(message) {
    const senderJid = getJid(message.key.remoteJid, message);
    const isGroup = getGroupData(message);
    return { senderJid, isGroup };
}
