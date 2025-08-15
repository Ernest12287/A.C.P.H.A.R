import { isJidGroup } from "baileys-x";

export default {
    name: 'vcf',
    aliases: ['groupvcf', 'getvcf'],
    description: 'Gets the current group vcf of users. (Admin Only)',
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: true,
    category: 'Groups',

    /**
     * Executes the vcf command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     */
    async execute(sock, message, args, logger) {
        try {
            // Check if the command is used in a group
            const from = message.key.remoteJid;
            if (!isJidGroup(from)) {
                return await sock.sendMessage(from, {
                    text: '❌ This command can only be used in groups!'
                });
            }

            // Get group metadata
            const groupMetadata = await sock.groupMetadata(from);
            const groupName = groupMetadata.subject;
            const participants = groupMetadata.participants;

            // Generate VCF content
            let vcfContent = '';
            let contactCount = 0;

            for (const participant of participants) {
                try {
                    const jid = participant.id;
                    const phoneNumber = jid.split('@')[0];
                    
                    // Try to get the contact name from the group
                    let contactName = participant.notify || phoneNumber;
                    
                    // Try to get profile name if available
                    try {
                        const profileInfo = await sock.onWhatsApp(jid);
                        if (profileInfo && profileInfo.length > 0 && profileInfo[0].name) {
                            contactName = profileInfo[0].name;
                        }
                    } catch (e) {
                        // If we can't get profile info, use what we have
                    }

                    // Generate VCF entry
                    vcfContent += `BEGIN:VCARD\n`;
                    vcfContent += `VERSION:3.0\n`;
                    vcfContent += `FN:${contactName}\n`;
                    vcfContent += `TEL;TYPE=CELL:+${phoneNumber}\n`;
                    vcfContent += `END:VCARD\n`;
                    
                    contactCount++;
                } catch (error) {
                    console.log(`Error processing participant ${participant.id}:`, error);
                }
            }

            if (contactCount === 0) {
                return await sock.sendMessage(from, {
                    text: '❌ No contacts found to export!'
                });
            }

            // Create filename with group name (sanitized)
            const sanitizedGroupName = groupName.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${sanitizedGroupName}_contacts.vcf`;

            // Send the VCF file
            await sock.sendMessage(from, {
                document: Buffer.from(vcfContent),
                fileName: filename,
                mimetype: 'text/vcard',
                caption: `📋 *VCF Export Complete*\n\n` +
                         `📁 Group: ${groupName}\n` +
                         `👥 Contacts: ${contactCount}\n` +
                         `📄 File: ${filename}\n\n` +
                         `*Download and import this file to your contacts app!*`
            }, { quoted: message });

            // Also send a summary message
            await sock.sendMessage(from, {
                text: `✅ Successfully exported ${contactCount} contacts from "${groupName}" group!`
            }, { quoted: message });

        } catch (error) {
            console.error('VCF Command Error:', error);
            await sock.sendMessage(from, {
                text: '❌ An error occurred while generating the VCF file. Please try again.'
            }, { quoted: message });
        }
    },
};
