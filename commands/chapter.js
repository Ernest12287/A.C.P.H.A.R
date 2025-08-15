import fetch from 'node-fetch';

export default {
    name: 'chapter',
    aliases: ['ch'],
    description: 'Fetches all verses for a given chapter.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Religion',

    /**
     * Executes the chapter command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;

        // If no arguments are provided, send a usage message
        if (args.length === 0) {
            return await sock.sendMessage(from, {
                text: "📖 Please provide a Bible reference for a chapter. \n\n*Examples:*\n!chapter Psalm 23\n!ch John 1"
            }, { quoted: msg });
        }

        const query = args.join(' ');
        const apiUrl = `https://bible-api.com/${encodeURIComponent(query)}?translation=web`;

        try {
            // Fetch the entire chapter from the API
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();

            // Check if the API returned an error message
            if (data.error) {
                return await sock.sendMessage(from, {
                    text: `❌ An error occurred: ${data.error}`
                }, { quoted: msg });
            }

            // Build the formatted response string for the entire chapter
            let responseText = `📖 *${data.reference}*\n\n`;
            data.verses.forEach(verse => {
                responseText += `*${verse.verse}.* ${verse.text}\n\n`;
            });
            responseText += `_Translation: ${data.translation_name}_`;

            // Send the formatted message back to the user
            await sock.sendMessage(from, {
                text: responseText
            }, { quoted: msg });

        } catch (error) {
            console.error('Chapter command error:', error);
            await sock.sendMessage(from, {
                text: `❌ An error occurred while fetching the chapter. Please check your spelling and try again.`
            }, { quoted: msg });
        }
    }
};
