// src/commands/utility/text.js
import { readFileSync } from 'fs';
import { promisify } from 'util';
import vCard from 'vcard-parser';

// In-memory cooldown store
const cooldowns = new Map();

export default {
    name: 'text',
    aliases: ['broadcast'],
    description: '💬 Sends a text message to all numbers in a replied-to vCard (.vcf) file. A 40s cooldown is applied after sending to 2+ people.',
    isPremium: false,
    groupOnly: false,
    privateOnly: true, // This is a sensitive command, best to keep it private only
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the text command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const senderJid = message.key.participant || message.key.remoteJid;

        // Check for a replied-to message that is a contact card
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const vcardMessage = quotedMessage?.contactMessage;

        if (!vcardMessage) {
            return await sock.sendMessage(chatId, {
                text: "❌ *Usage Error*\n\nThis command only works when replying to a contact card (.vcf) file. Please reply to a vCard with your message."
            }, { quoted: message });
        }

        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `❌ *Usage Error*\n\nPlease provide a message to send. Example: \`${context.commandPrefix}text Hello everyone, check out my channel!\``
            }, { quoted: message });
        }

        const textToSend = args.join(' ').trim();
        let vcardString = vcardMessage.vcard;

        // Parse vCard to get phone numbers
        const numbers = [];
        const lines = vcardString.split('\n');
        lines.forEach(line => {
            if (line.startsWith('TEL;')) {
                // Extract number from TEL line, remove all non-numeric characters
                const match = line.match(/:(.*)/);
                if (match && match[1]) {
                    const number = match[1].replace(/[^0-9]/g, '');
                    if (number) {
                        numbers.push(number);
                    }
                }
            }
        });

        if (numbers.length === 0) {
            return await sock.sendMessage(chatId, {
                text: "🤷‍♀️ No valid phone numbers found in the replied-to vCard file."
            }, { quoted: message });
        }

        // Apply cooldown logic
        const lastUsage = cooldowns.get(senderJid);
        const now = Date.now();
        const cooldownAmount = 40000; // 40 seconds in milliseconds

        if (numbers.length > 2 && lastUsage && now - lastUsage < cooldownAmount) {
            const timeLeft = Math.ceil((cooldownAmount - (now - lastUsage)) / 1000);
            return await sock.sendMessage(chatId, {
                text: `⏳ *Cooldown*\n\nYou must wait ${timeLeft} seconds before using this command for more than 2 recipients.`
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: `✅ Broadcasting your message to ${numbers.length} recipient(s)...` }, { quoted: message });
        logger.info(`User ${senderJid} broadcasting message to ${numbers.length} numbers.`);

        // Iterate through numbers and send the message
        let sentCount = 0;
        for (const number of numbers) {
            // Format number for Baileys
            const recipientJid = `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
            try {
                // Check if it's a valid WhatsApp user before sending to avoid errors
                // This step can be resource-intensive, so for a simple bot, we might skip it
                // and just rely on the API to fail gracefully. We'll send directly for simplicity.
                await sock.sendMessage(recipientJid, { text: textToSend });
                sentCount++;
                logger.info(`Message sent to ${recipientJid}.`);
            } catch (error) {
                logger.error(`Failed to send message to ${recipientJid}:`, error);
            }
        }

        // Set cooldown after sending
        if (numbers.length > 2) {
            cooldowns.set(senderJid, now);
        }

        await sock.sendMessage(chatId, {
            text: `🎉 *Broadcast Complete*\n\nSuccessfully sent your message to ${sentCount} of ${numbers.length} recipients.`
        }, { quoted: message });
    }
};