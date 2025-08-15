// src/commands/user/whois.js

import { jidNormalizedUser } from 'baileys-x';

export default {
    name: 'whois',
    aliases: ['who', 'whois'],
    description: 'Displays a user\'s profile picture and public information. Can be used by replying to a message, tagging a user, or providing their number.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // This command is restricted to group admins
    category: 'user',

    /**
     * Executes the whois command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;
        const senderJid = message.key.participant || message.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

        // --- NEW: Admin Check ---
        if (isGroup) {
            try {
                const groupMetadata = await sock.groupMetadata(from);
                const senderIsAdmin = groupMetadata.participants.find(p => p.id === senderJid)?.isAdmin;

                if (!senderIsAdmin) {
                    return await sock.sendMessage(from, {
                        text: "❌ This command is restricted to group admins."
                    }, { quoted: msg });
                }
            } catch (error) {
                console.error("Error fetching group metadata:", error);
                return await sock.sendMessage(from, {
                    text: "❌ An error occurred while checking admin status. Please try again."
                }, { quoted: msg });
            }
        }
        // --- END NEW: Admin Check ---

        try {
            let targetJid;

            // Priority 1: Check for tagged user
            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (mentionedJid) {
                targetJid = mentionedJid;
            } 
            // Priority 2: Check for a number in the arguments
            else if (args[0] && args[0].startsWith('2')) {
                // Clean the number and append the JID suffix
                targetJid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            } 
            // Priority 3: Check if the command is a reply to another message
            else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            } 
            // Fallback: Default to the sender of the command
            else {
                targetJid = senderJid;
            }

            if (!targetJid) {
                return await sock.sendMessage(from, { 
                    text: "❌ Please tag a user, provide a number, or reply to a message to use this command." 
                }, { quoted: msg });
            }

            const normalizedJid = jidNormalizedUser(targetJid);
            const targetNumber = normalizedJid.split('@')[0];

            let userInfo = `*🕵️‍♂️ User Information for ${targetNumber}:*\n\n`;

            // Fetch Profile Picture URL
            try {
                const pfpUrl = await sock.profilePictureUrl(normalizedJid, 'image');
                if (pfpUrl) {
                    // Send the profile picture and then the text info for a cleaner display
                    await sock.sendMessage(from, { 
                        image: { url: pfpUrl }, 
                        caption: `📸 *Profile Picture:* [Link](${pfpUrl})` 
                    });
                } else {
                    userInfo += `🖼️ *Profile Picture:* Not available or private.\n`;
                }
            } catch (error) {
                if (error.data === 401 || error.message === 'not-authorized') {
                    userInfo += `🖼️ *Profile Picture:* Private/Not accessible.\n`;
                } else {
                    console.error(`Error fetching PFP for ${normalizedJid}:`, error);
                    userInfo += `🖼️ *Profile Picture:* Error fetching.\n`;
                }
            }

            // Fetch Status Message
            try {
                const status = await sock.fetchStatus(normalizedJid);
                if (status && status.status) {
                    userInfo += `\n💬 *About:* ${status.status}\n`;
                } else {
                    userInfo += `\n💬 *About:* Not set or private.\n`;
                }
            } catch (error) {
                console.error(`Error fetching status for ${normalizedJid}:`, error);
                userInfo += `\n💬 *About:* Error fetching.\n`;
            }

            // Fetch Business Profile (if applicable)
            try {
                const businessProfile = await sock.getBusinessProfile(normalizedJid);
                if (businessProfile && Object.keys(businessProfile).length > 0) {
                    userInfo += `\n🏢 *Business Profile:*\n`;
                    if (businessProfile.name) userInfo += `   - Name: ${businessProfile.name}\n`;
                    if (businessProfile.address) userInfo += `   - Address: ${businessProfile.address}\n`;
                    if (businessProfile.description) userInfo += `   - Description: ${businessProfile.description}\n`;
                    if (businessProfile.email) userInfo += `   - Email: ${businessProfile.email}\n`;
                    if (businessProfile.websites && businessProfile.websites.length > 0) {
                        userInfo += `   - Websites: ${businessProfile.websites.join(', ')}\n`;
                    }
                } else {
                    userInfo += `\n🏢 *Business Profile:* Not a business account or no public info.\n`;
                }
            } catch (error) {
                console.error(`Error fetching business profile for ${normalizedJid}:`, error);
                userInfo += `\n🏢 *Business Profile:* Error fetching.\n`;
            }

            await sock.sendMessage(from, { text: userInfo }, { quoted: msg });

        } catch (err) {
            console.error("❌ Error in whois command:", err);
            await sock.sendMessage(from, { 
                text: `🚫 An error occurred while fetching user info: ${err.message}` 
            }, { quoted: msg });
        }
    },
};