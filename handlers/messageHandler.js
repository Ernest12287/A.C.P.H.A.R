// handlers/messageHandler.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import pkg from 'baileys-x';
const { jidNormalizedUser, getContentType } = pkg;

import messageStorage from '../data/messageStorage.js';
import specialContactsStorage from '../data/specialContactsStorage.js';
import { handleSpecialAlert } from './specialAlerts.js';

// New imports for access control and utils
import { getSenderInfo } from '../utils/userUtils.js';
import { isPremiumUser } from '../utils/premiumUtils.js';
import { getMessageText } from '../utils/messageUtils.js';
import { isSenderAdmin, groupSettings } from '../utils/grouputils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = {};
export const commandDescriptions = {};

export const loadCommands = async () => {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(
        file => file.endsWith('.js') && !file.startsWith('_')
    );

    for (const file of commandFiles) {
        const modulePath = pathToFileURL(path.join(commandsPath, file)).href;

        try {
            const module = await import(modulePath);
            const commandName = path.basename(file, '.js');

            if (typeof module.default === 'function') {
                commands[commandName] = module.default;
                if (module.default.description) {
                    commandDescriptions[commandName] = module.default.description;
                }
            } else if (module.default && module.default.name) {
                // Handle the new command structure with a default object
                commands[commandName] = module.default;
                if (module.default.description) {
                    commandDescriptions[commandName] = module.default.description;
                }
            } else {
                console.warn(`Skipping ${file}: No valid command export found.`);
            }
        } catch (error) {
            console.error(`❌ Failed to load command '${file}':`, error);
        }
    }
    return commands;
};

export const messageHandler = async (sock) => {
    if (sock._messageHandlerRegistered) return;
    sock._messageHandlerRegistered = true;

    const commandList = await loadCommands();
    const prefix = process.env.PREFIX || '!';

    // --- Configuration Variables ---
    const autoReadGeneralEnabled = process.env.AUTO_READ_MESSAGES === 'true';
    const botSignatureEnabled = process.env.BOT_SIGNATURE_ENABLED === 'true';
    const botSignatureText = process.env.BOT_SIGNATURE_TEXT || ' | Bot';
    const autoViewStatusEnabled = process.env.AUTO_VIEW_STATUS_ENABLED === 'true';
    const sendStatusNotificationEnabled = process.env.SEND_STATUS_VIEW_NOTIFICATION_ENABLED === 'true';
    const statusViewNotificationText = process.env.STATUS_VIEW_NOTIFICATION_TEXT || 'Just viewed your status. -Bot';
    const autoViewChannelsEnabled = process.env.AUTO_VIEW_CHANNELS_ENABLED === 'true';
    const autoTypingIndicatorEnabled = process.env.AUTO_TYPING_INDICATOR_ENABLED === 'true';
    const specialContactAlertsEnabled = process.env.SPECIAL_CONTACT_ALERTS_ENABLED === 'true';

    const reactionEmojis = ['✅', '👍', '✨', '🚀', '🌟', '🤖', '🔥', '🎉', '💡', '💬', '💫', '👍'];

    if (autoReadGeneralEnabled) {
        console.log("INFO: General auto-reading of all incoming messages is ENABLED.");
    } else {
        console.log("INFO: General auto-reading of all incoming messages is DISABLED.");
    }
    if (autoViewStatusEnabled) {
        console.log(`INFO: Auto-viewing status updates is ENABLED.`);
        if (sendStatusNotificationEnabled) {
            console.log(`INFO: Sending notification after status view is ENABLED.`);
        }
    } else {
        console.log("INFO: Auto-viewing status updates is DISABLED.");
    }
    if (autoViewChannelsEnabled) {
        console.log("INFO: Auto-viewing channel updates is ENABLED.");
    } else {
        console.log("INFO: Auto-viewing channel updates is DISABLED.");
    }
    if (autoTypingIndicatorEnabled) {
        console.log("INFO: Auto-typing indicator on incoming messages is ENABLED.");
    } else {
        console.log("INFO: Auto-typing indicator on incoming messages is DISABLED.");
    }
    if (specialContactAlertsEnabled) {
        console.log("INFO: Special contact alerts are ENABLED via .env. List will be dynamic.");
    } else {
        console.log("INFO: Special contact alerts are DISABLED via .env.");
    }

    await messageStorage.initialize();
    await specialContactsStorage.initialize();

    setInterval(() => messageStorage.pruneOldMessages(7), 24 * 60 * 60 * 1000);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            const from = msg.key.remoteJid;
            if (!from) continue;
            const botJid = sock.user.id;
            const isGroup = from.endsWith('@g.us');
            const senderJid = getSenderInfo(msg).senderJid;
            const isOwner = senderJid === jidNormalizedUser(process.env.OWNER_NUMBER + "@s.whatsapp.net");
            const isPremium = isPremiumUser(senderJid);
            const messageContent = getMessageText(msg);

            // --- Show Typing Indicator Immediately (if enabled and not from bot) ---
            if (autoTypingIndicatorEnabled && !msg.key.fromMe) {
                await sock.sendPresenceUpdate('composing', from);
                console.log(`DEBUG: Sent 'composing' presence to ${from}.`);
            }

            try {
                let messageHandledByAutoFeatures = false;

                // --- 1. Handle Status Messages ---
                if (from === 'status@broadcast') {
                    if (autoViewStatusEnabled) {
                        const statusOwnerJid = msg.key.participant;
                        if (statusOwnerJid && statusOwnerJid !== botJid) {
                            await sock.readMessages([msg.key], 'read');
                            console.log(`DEBUG: Auto-viewed status from ${statusOwnerJid} (ID: ${msg.key.id}).`);

                            // Add the reaction as requested
                            await sock.sendMessage(statusOwnerJid, {
                                react: {
                                    text: '❤️',
                                    key: msg.key
                                }
                            });

                            if (sendStatusNotificationEnabled) {
                                await sock.sendMessage(statusOwnerJid, { text: statusViewNotificationText });
                                console.log(`DEBUG: Sent status view notification to ${statusOwnerJid}.`);
                            }
                        }
                    }
                    messageHandledByAutoFeatures = true;
                }

                // --- 2. Handle Group Moderation (if enabled and applicable) ---
                if (isGroup && groupSettings[from]) {
                    const groupConfig = groupSettings[from];
                    const senderIsAdmin = await isSenderAdmin(sock, from, senderJid);
                    if (!senderIsAdmin) {
                        const messageType = Object.keys(msg.message)[0];
                        if (groupConfig.antilink && /(https?:\/\/[^\s]+)/.test(messageContent)) {
                            await sock.sendMessage(from, { text: "⚠️ Please do not send links in this group." }, { quoted: msg });
                            await sock.sendMessage(from, { delete: msg.key });
                            continue;
                        }
                        // Add more checks here for anti-bot, antimedia, etc.
                        if (groupConfig.antimedia && ['imageMessage', 'videoMessage', 'audioMessage'].includes(messageType)) {
                            await sock.sendMessage(from, { text: "⚠️ Media is not allowed in this group." }, { quoted: msg });
                            await sock.sendMessage(from, { delete: msg.key });
                            continue;
                        }
                        if (groupConfig.antisticker && messageType === "stickerMessage") {
                            await sock.sendMessage(from, { text: "⚠️ Stickers are not allowed in this group." }, { quoted: msg });
                            await sock.sendMessage(from, { delete: msg.key });
                            continue;
                        }
                        if (groupConfig.antibad || groupConfig.antinsfw) {
                            const badwords = [...(groupConfig.badwords || [])];
                            if (groupConfig.antinsfw) {
                                badwords.push("nude", "sex", "porn", "fuck", "shit", "bitch");
                            }
                            const hasBadWord = badwords.some(word => messageContent.toLowerCase().includes(word));
                            if (hasBadWord) {
                                await sock.sendMessage(from, { text: "⚠️ Inappropriate language is not allowed in this group." }, { quoted: msg });
                                await sock.sendMessage(from, { delete: msg.key });
                                continue;
                            }
                        }
                        if (groupConfig.antimenu) {
                             const commandName = messageContent.split(" ")[0].toLowerCase().slice(prefix.length);
                             if (["menu", "help"].includes(commandName)) {
                                 await sock.sendMessage(from, { text: "❌ Menu commands are disabled in this group." }, { quoted: msg });
                                 continue;
                             }
                         }
                    }
                }

                // --- 3. Handle Channel Messages ---
                if (from.endsWith('@newsletter') && !messageHandledByAutoFeatures) {
                    if (autoViewChannelsEnabled) {
                        await sock.readMessages([msg.key], 'read');
                        console.log(`DEBUG: Auto-read channel message from ${from} (ID: ${msg.key.id}).`);
                    }
                    messageHandledByAutoFeatures = true;
                }

                // --- 4. Handle General Auto-Read ---
                if (autoReadGeneralEnabled && !msg.key.fromMe && !messageHandledByAutoFeatures) {
                    await sock.readMessages([msg.key], 'read');
                    console.log(`DEBUG: General auto-read message from ${from} (ID: ${msg.key.id}).`);
                    messageHandledByAutoFeatures = true;
                }

                // --- 5. Special Contact Alert ---
                if (specialContactAlertsEnabled && !msg.key.fromMe && specialContactsStorage.hasContact(jidNormalizedUser(from))) {
                    await handleSpecialAlert(sock, msg, from, specialContactsStorage.getAllContacts(), botJid);
                }

                // --- 6. Handle Antidelete ---
                

                // --- 7. Handle Commands (New logic starts here) ---
                if (!messageContent || !messageContent.startsWith(prefix)) {
                    if (autoTypingIndicatorEnabled && !msg.key.fromMe) {
                        await sock.sendPresenceUpdate('paused', from);
                        console.log(`DEBUG: Sent 'paused' presence to ${from} (non-command).`);
                    }
                    continue;
                }

                const args = messageContent.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                const command = commandList[commandName];

                if (command) {
                    const commandContext = {
                        isOwner,
                        isPremium,
                        isGroup,
                        ownerJid: jidNormalizedUser(process.env.OWNER_NUMBER + "@s.whatsapp.net"),
                        commandPrefix: prefix,
                        senderJid,
                        commandMap: commandList,
                    };

                    // Access Control Checks
                    if (command.ownerOnly && !isOwner) {
                        await sock.sendMessage(from, { text: "🔒 *Access Denied*\n\nThis command is restricted to the bot owner." }, { quoted: msg });
                        continue;
                    }
                    if (command.adminOnly && isGroup) {
                        const isSenderAnAdmin = await isSenderAdmin(sock, from, senderJid);
                        if (!isSenderAnAdmin) {
                            await sock.sendMessage(from, { text: "❌ This command is restricted to group admins." }, { quoted: msg });
                            continue;
                        }
                    }
                    if (command.isPremium && !isPremium) {
                        await sock.sendMessage(from, { text: "👑 *Premium Command* 👑\n\nThis command is exclusive to premium users." }, { quoted: msg });
                        continue;
                    }
                    if (command.groupOnly && !isGroup) {
                        await sock.sendMessage(from, { text: "This command can only be used in a group." }, { quoted: msg });
                        continue;
                    }
                    if (command.privateOnly && isGroup) {
                        await sock.sendMessage(from, { text: "This command can only be used in a private chat with the bot." }, { quoted: msg });
                        continue;
                    }

                    // Command execution
                    const originalSendMessage = sock.sendMessage;
                    sock.sendMessage = async (jid, content, options) => {
                        let finalContent = { ...content };
                        if (botSignatureEnabled) {
                            if (finalContent.text) {
                                finalContent.text += botSignatureText;
                            } else if (finalContent.caption) {
                                finalContent.caption += botSignatureText;
                            }
                        }
                        return originalSendMessage.call(sock, jid, finalContent, options);
                    };

                    // Note: The execute function signature should now match (sock, msg, args, logger, commandContext)
                    await command.execute(sock, msg, args, console, commandContext);
                    sock.sendMessage = originalSendMessage;

                    const randomEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
                    await sock.sendMessage(from, {
                        react: {
                            text: randomEmoji,
                            key: msg.key
                        }
                    });
                } else {
                    console.log(`🚫 Unknown command: ${commandName}`);
                }

            } catch (err) {
                console.error('⚠️ Error handling message:', err);
                if (autoTypingIndicatorEnabled && !msg.key.fromMe) {
                    await sock.sendPresenceUpdate('paused', from);
                    console.log(`DEBUG: Sent 'paused' presence to ${from} (on error).`);
                }
            }
        }
    });
};

export const commandMap = commands;