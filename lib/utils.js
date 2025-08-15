import dotenv from 'dotenv';
dotenv.config();

/**
 * Checks if the given WhatsApp JID is the bot owner.
 * Owner number is read from .env (without @s.whatsapp.net).
 */
export function isOwner(jid) {
    if (!process.env.OWNER_NUMBER) {
        console.warn('⚠ OWNER_NUMBER is not set in your .env file!');
        return false;
    }
    const cleanJid = jid.replace(/[^0-9]/g, '');
    const ownerNumber = process.env.OWNER_NUMBER.replace(/[^0-9]/g, '');
    return cleanJid === ownerNumber;
}

/**
 * Sends an error message to the given chat.
 */
export async function sendError(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { text: `❌ ${message}` });
    } catch (err) {
        console.error('Failed to send error message:', err);
    }
}