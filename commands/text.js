// src/commands/tools/text.js
import pkg from 'baileys-x';
const { downloadContentFromMessage, jidNormalizedUser } = pkg;
import vCard from 'vcard-parser'; // Ensure 'vcard-parser' is installed
import {
    getOwnerContactLists,
    setOwnerContactList,
    deleteOwnerContactList
} from '../utils/contactListManager.js';
import { setTimeout } from 'timers/promises'; // For broadcast delay

// Map to keep track of ongoing broadcasts to prevent multiple simultaneous broadcasts
const activeBroadcasts = new Map();

export default {
    name: 'text',
    aliases: ['broadcast', 'bulkmsg'],
    description: 'Manages and sends bulk messages to contact lists from VCF files. (Owner/Premium only)',
    isPremium: true,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // This command is owner/admin only
    category: 'Tools',

    /**
     * Executes the text command.
     * Subcommands: save <list_name>, send <list_name> <message>, list, delete <list_name>
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context (isOwner, isPremiumUser, senderJid).
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const senderJid = context.senderJid; // Normalized owner JID

        // Ensure only owner/admin can use this command
        if (!context.isOwner && !context.isAdmin) { // Adjusted to allow admins too, as per original code context
            return await sock.sendMessage(chatId, { text: '🔒 *Access Denied*\n\nThis command is restricted to bot administrators or the owner.' }, { quoted: message });
        }

        // Ensure premium status for non-owners
        if (!context.isOwner && !context.isPremiumUser) {
            return await sock.sendMessage(chatId, {
                text: "🔒 *ACEPHAR Premium Feature*\n\nThis bulk messaging command is exclusive to *Premium Subscribers*.\nUpgrade your ACEPHAR experience for full access!\n\n_Contact Ernest Tech House for subscription details._"
            }, { quoted: message });
        }

        const subcommand = args[0]?.toLowerCase();

        switch (subcommand) {
            case 'save':
                await handleSaveCommand(sock, message, args.slice(1), logger, context);
                break;
            case 'send':
                await handleSendCommand(sock, message, args.slice(1), logger, context);
                break;
            case 'list':
                await handleListCommand(sock, message, logger, context);
                break;
            case 'delete':
                await handleDeleteCommand(sock, message, args.slice(1), logger, context);
                break;
            default:
                await sock.sendMessage(chatId, {
                    text: `❌ *Usage Error*\n\nInvalid subcommand. Available:
\`${context.commandPrefix}text save <list_name>\` (Reply to VCF or send with VCF)
\`${context.commandPrefix}text send <list_name> <message>\`
\`${context.commandPrefix}text list\`
\`${context.commandPrefix}text delete <list_name>\`
                    `
                }, { quoted: message });
                break;
        }
    },
};

/**
 * Handles the 'save' subcommand: parses VCF and saves contacts.
 */
async function handleSaveCommand(sock, message, args, logger, context) {
    const chatId = message.key.remoteJid;
    const senderJid = context.senderJid;
    const listName = args[0]?.trim();

    if (!listName) {
        return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a name for this contact list. Example: \`${context.commandPrefix}text save MyClients\`` }, { quoted: message });
    }

    let vcardMessage = null;
    let mediaType = null;

    // Check if it's a replied message
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = message.message.extendedTextMessage.contextInfo.quotedMessage;
        logger.debug('Quoted message detected. Checking its type...');
        if (quoted.documentMessage) {
            vcardMessage = quoted.documentMessage;
            mediaType = 'document';
            logger.debug(`Quoted document message found. Mimetype: ${vcardMessage.mimetype}`);
        } else if (quoted.contactMessage) { // Sometimes VCFs come as contact messages
            vcardMessage = quoted.contactMessage;
            mediaType = 'contact';
            logger.debug(`Quoted contact message found. VCard: ${vcardMessage.vcard}`);
        }
    }
    // Check if the message itself is a document or contact message
    else if (message.message?.documentMessage) {
        vcardMessage = message.message.documentMessage;
        mediaType = 'document';
        logger.debug(`Direct document message found. Mimetype: ${vcardMessage.mimetype}`);
    } else if (message.message?.contactMessage) { // Sometimes VCFs come as contact messages
        vcardMessage = message.message.contactMessage;
        mediaType = 'contact';
        logger.debug(`Direct contact message found. VCard: ${vcardMessage.vcard}`);
    }

    // NEW: Log the entire message object for debugging if VCF not found
    if (!vcardMessage) {
        logger.error('No VCF/contact message found. Full message object:', JSON.stringify(message, null, 2));
        return await sock.sendMessage(chatId, { text: `❌ *Input Error*\n\nPlease reply to a VCF file or send a VCF file with the command to save contacts.` }, { quoted: message });
    }

    let vcfContent = '';
    if (mediaType === 'document') {
        // Allow both 'text/vcard' and 'text/x-vcard'
        if (vcardMessage.mimetype !== 'text/vcard' && vcardMessage.mimetype !== 'text/x-vcard') {
            logger.warn(`Document message found, but mimetype is not text/vcard or text/x-vcard: ${vcardMessage.mimetype}`);
            return await sock.sendMessage(chatId, { text: `❌ *Invalid File Type*\n\nThe attached file is not a VCF (vCard) file. Please provide a valid VCF.` }, { quoted: message });
        }
        await sock.sendMessage(chatId, { text: `📥 Downloading and parsing VCF document for list "*${listName}*"...` }, { quoted: message });
        const stream = await downloadContentFromMessage(vcardMessage, 'document');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        vcfContent = buffer.toString('utf8');
    } else if (mediaType === 'contact' && vcardMessage.vcard) {
        await sock.sendMessage(chatId, { text: `📥 Parsing contact card for list "*${listName}*"...` }, { quoted: message });
        vcfContent = vcardMessage.vcard;
    } else {
        logger.error('VCF message found but neither document nor contact type handled correctly.');
        return await sock.sendMessage(chatId, { text: `❌ *Processing Error*\n\nCould not process the VCF/contact message. Please ensure it's a standard VCF format.` }, { quoted: message });
    }

    try {
        const parsedResult = vCard.parse(vcfContent);
        // Ensure parsedResult is an array. If it's a single object, wrap it in an array.
        const parsedVCards = Array.isArray(parsedResult) ? parsedResult : [parsedResult];

        const contactJids = [];

        for (const card of parsedVCards) {
            // Check if card and card.tel exist and are arrays
            if (card && card.tel && Array.isArray(card.tel)) {
                for (const tel of card.tel) {
                    // Ensure tel and tel.value exist
                    if (tel && tel.value) {
                        let number = String(tel.value).replace(/\D/g, ''); // Ensure it's a string, then remove non-digits
                        // Basic normalization: Ensure it starts with country code, e.g., 254...
                        if (number.startsWith('0')) {
                            number = '254' + number.substring(1); // Assuming Kenya numbers, adjust if needed
                        } else if (!number.startsWith('254') && number.length === 9) { // If 9 digits and no country code, assume 254
                            number = '254' + number;
                        }
                        if (number.length >= 7) { // Basic validation for reasonable length
                            contactJids.push(jidNormalizedUser(`${number}@s.whatsapp.net`));
                        } else {
                            logger.warn(`Skipping invalid number length: ${number}`);
                        }
                    } else {
                        logger.warn('Skipping telephone entry with missing value.');
                    }
                }
            } else {
                logger.warn('Skipping vCard with missing or invalid telephone property.');
            }
        }

        if (contactJids.length === 0) {
            return await sock.sendMessage(chatId, { text: `⚠️ *No Contacts Found*\n\nNo valid phone numbers could be extracted from the VCF file.` }, { quoted: message });
        }

        // Remove duplicates
        const uniqueContactJids = [...new Set(contactJids)];

        await setOwnerContactList(senderJid, listName, uniqueContactJids);

        await sock.sendMessage(chatId, {
            text: `✅ *Contacts Saved!*
Successfully saved *${uniqueContactJids.length}* unique contacts to list "*${listName}*".
You can now send messages to this list using \`${context.commandPrefix}text send ${listName} <message>\`.`
        }, { quoted: message });
        logger.info(`Saved ${uniqueContactJids.length} contacts to list "${listName}" for ${senderJid}.`);

    } catch (error) {
        logger.error(`Error saving contacts for ${senderJid}, list "${listName}":`, error);
        await sock.sendMessage(chatId, { text: '❌ *Error Saving Contacts*\n\nAn error occurred while processing the VCF file. Ensure it is a valid VCF format and contains valid phone numbers.' }, { quoted: message });
    }
}

/**
 * Handles the 'send' subcommand: sends messages to contacts in a list with delay.
 */
async function handleSendCommand(sock, message, args, logger, context) {
    const chatId = message.key.remoteJid;
    const senderJid = context.senderJid;
    const listName = args[0]?.trim();
    const broadcastMessage = args.slice(1).join(' ').trim();

    if (!listName || !broadcastMessage) {
        return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a list name and the message to send. Example: \`${context.commandPrefix}text send MyClients Hello everyone!\`` }, { quoted: message });
    }

    if (activeBroadcasts.has(senderJid)) {
        return await sock.sendMessage(chatId, { text: '⚠️ *Broadcast In Progress*\n\nYou already have an active broadcast running. Please wait for it to complete before starting a new one.' }, { quoted: message });
    }

    const ownerLists = await getOwnerContactLists(senderJid);
    const contactsToSend = ownerLists[listName];

    if (!contactsToSend || contactsToSend.length === 0) {
        return await sock.sendMessage(chatId, { text: `❌ *List Not Found*\n\nContact list "*${listName}*" not found or is empty. Use \`${context.commandPrefix}text save ${listName}\` to create it.` }, { quoted: message });
    }

    await sock.sendMessage(chatId, { text: `🚀 Starting broadcast to *${contactsToSend.length}* contacts in list "*${listName}*"...\n\n_Messages will be sent with a 30-second delay between each._` }, { quoted: message });
    logger.info(`Starting broadcast for ${senderJid} to list "${listName}" (${contactsToSend.length} contacts).`);

    activeBroadcasts.set(senderJid, true); // Mark broadcast as active

    let sentCount = 0;
    let failedCount = 0;
    // Removed lastProgressMessageId and relayMessage logic

    try {
        // Send initial progress message (always a new message now)
        await sock.sendMessage(chatId, { text: `Broadcast Progress: Sent 0/${contactsToSend.length}, Failed 0` }, { quoted: message });


        for (const contactJid of contactsToSend) {
            try {
                await sock.sendMessage(contactJid, { text: broadcastMessage });
                sentCount++;
                logger.debug(`Message sent to ${contactJid}.`);
            } catch (error) {
                failedCount++;
                logger.error(`Failed to send message to ${contactJid}:`, error.message);
            }

            // Send new progress message every 5 messages or if it's the last one
            if (sentCount % 5 === 0 || (sentCount + failedCount) === contactsToSend.length) {
                await sock.sendMessage(chatId, { text: `Broadcast Progress: Sent ${sentCount}/${contactsToSend.length}, Failed ${failedCount}` });
            }

            // Apply 30-second delay between messages
            if ((sentCount + failedCount) < contactsToSend.length) {
                await setTimeout(30000); // 30 seconds delay
            }
        }

        await sock.sendMessage(chatId, {
            text: `✅ *Broadcast Complete!*
Sent: ${sentCount}
Failed: ${failedCount}
List: "*${listName}*"`
        }, { quoted: message });
        logger.info(`Broadcast to list "${listName}" completed for ${senderJid}. Sent: ${sentCount}, Failed: ${failedCount}`);

    } catch (error) {
        logger.error(`Critical error during broadcast for ${senderJid}, list "${listName}":`, error);
        await sock.sendMessage(chatId, { text: '❌ *Broadcast Interrupted*\n\nAn unexpected error occurred during the broadcast. Please check logs.' }, { quoted: message });
    } finally {
        activeBroadcasts.delete(senderJid); // Clear active broadcast flag
    }
}

/**
 * Handles the 'list' subcommand: lists available contact lists.
 */
async function handleListCommand(sock, message, logger, context) {
    const chatId = message.key.remoteJid;
    const senderJid = context.senderJid;

    const ownerLists = await getOwnerContactLists(senderJid);
    const listNames = Object.keys(ownerLists);

    if (listNames.length === 0) {
        return await sock.sendMessage(chatId, { text: 'ℹ️ *Your Contact Lists*\n\nYou have no saved contact lists. Use `!text save <list_name>` to create one.' }, { quoted: message });
    }

    let responseText = '📝 *Your Saved Contact Lists:*\n\n';
    for (let i = 0; i < listNames.length; i++) {
        const listName = listNames[i];
        const count = ownerLists[listName].length;
        responseText += `${i + 1}. *${listName}* (${count} contacts)\n`;
    }

    responseText += `\n_Use \`${context.commandPrefix}text send <list_name> <message>\` to send a broadcast._
_Use \`${context.commandPrefix}text delete <list_name>\` to delete a list._`;

    await sock.sendMessage(chatId, { text: responseText.trim() }, { quoted: message });
    logger.info(`Listed contact lists for ${senderJid}.`);
}

/**
 * Handles the 'delete' subcommand: deletes a contact list.
 */
async function handleDeleteCommand(sock, message, args, logger, context) {
    const chatId = message.key.remoteJid;
    const senderJid = context.senderJid;
    const listName = args[0]?.trim();

    if (!listName) {
        return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide the name of the list to delete. Example: \`${context.commandPrefix}text delete MyClients\`` }, { quoted: message });
    }

    const deleted = await deleteOwnerContactList(senderJid, listName);

    if (deleted) {
        await sock.sendMessage(chatId, { text: `✅ *Success!* Contact list "*${listName}*" has been deleted.` }, { quoted: message });
        logger.info(`Deleted contact list "${listName}" for ${senderJid}.`);
    } else {
        await sock.sendMessage(chatId, { text: `❌ *List Not Found*\n\nContact list "*${listName}*" not found.` }, { quoted: message });
        logger.warn(`Attempted to delete non-existent list "${listName}" for ${senderJid}.`);
    }
}