// src/commands/owner/obfuscate.js

import fs from 'fs/promises';
import path from 'path';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { downloadContentFromMessage } from 'baileys-x';
import { getMessageText } from '../utils/messageUtils.js';

export default {
    name: 'obfuscate',
    aliases: ['obf'],
    description: 'Obfuscates a replied-to JavaScript file and returns the obfuscated code.',
    ownerOnly: true,
    category: 'user',

    /**
     * Executes the obfuscate command by replying to a JavaScript file.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Command arguments.
     * @param {object} logger - The logger instance.
     */
    async execute(sock, message, args, logger) {
        const from = message.key.remoteJid;
        const msg = message;
        
        const repliedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // Check if the user replied to a message
        if (!repliedMsg) {
            await sock.sendMessage(from, { text: '⚠️ Please reply to the JavaScript file you want to obfuscate.' }, { quoted: msg });
            return;
        }

        const documentMessage = repliedMsg.documentMessage;
        
        // Check if the replied message is a document
        if (!documentMessage) {
            await sock.sendMessage(from, { text: '⚠️ The replied message is not a file. Please reply to a JavaScript file.' }, { quoted: msg });
            return;
        }

        const fileName = documentMessage.fileName;
        
        // Check if the file is a JavaScript file
        if (!fileName || !fileName.endsWith('.js')) {
            await sock.sendMessage(from, { text: '🚫 The replied file is not a JavaScript file. Please make sure the file name ends with `.js`.' }, { quoted: msg });
            return;
        }
        
        try {
            await sock.sendMessage(from, { text: `🔄 Obfuscating file: \`${fileName}\`...` }, { quoted: msg });
            
            // Download the file content
            const stream = await downloadContentFromMessage(documentMessage, 'document');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            const originalCode = buffer.toString('utf-8');

            // Obfuscate the code
            const obfuscationResult = JavaScriptObfuscator.obfuscate(
                originalCode,
                {
                    compact: true,
                    controlFlowFlattening: true,
                    controlFlowFlatteningThreshold: 1,
                    deadCodeInjection: true,
                    deadCodeInjectionThreshold: 0.4,
                    stringArray: true,
                    stringArrayThreshold: 1,
                    rotateStringArray: true,
                    transformObjectKeys: true,
                    renameProperties: true,
                }
            );
            
            const obfuscatedCode = obfuscationResult.getObfuscatedCode();
            
            // Send the obfuscated code back as a new file
            await sock.sendMessage(from, {
                document: Buffer.from(obfuscatedCode, 'utf-8'),
                mimetype: 'application/javascript',
                fileName: `obfuscated_${fileName}`
            }, { quoted: msg });
            
            await sock.sendMessage(from, { text: `✅ Successfully obfuscated \`${fileName}\` and returned the new file.` }, { quoted: msg });

        } catch (err) {
            logger.error('❌ Error during obfuscation via reply:', err);
            await sock.sendMessage(from, { text: `🚫 An error occurred while obfuscating the file: ${err.message}` }, { quoted: msg });
        }
    }
};
