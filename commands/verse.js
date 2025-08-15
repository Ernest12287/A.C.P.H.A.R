import fetch from 'node-fetch'; // Assuming node-fetch is available in your environment

export default {
    name: 'verse',
    aliases: ['v'],
    description: 'Fetches a specific Bible verse or range of verses.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Religion',

    /**
     * Executes the verse command.
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
                text: "📖 Please provide a Bible reference. \n\n*Examples:*\n!verse John 3:16\n!v Matt 25:31-33\n!verse Psalm 23"
            }, { quoted: msg });
        }

        const query = args.join(' ');
        const apiUrl = `https://bible-api.com/${encodeURIComponent(query)}?translation=web`;

        try {
            // Fetch the verse from the API
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

            // Build the formatted response string
            let responseText = `📖 *${data.reference}*\n\n`;
            data.verses.forEach(verse => {
                responseText += `${verse.verse}. ${verse.text}\n`;
            });
            responseText += `\n_Translation: ${data.translation_name}_`;

            // Send the formatted message back to the user
            await sock.sendMessage(from, {
                text: responseText
            }, { quoted: msg });

        } catch (error) {
            console.error('Verse command error:', error);
            await sock.sendMessage(from, {
                text: `❌ An error occurred while fetching the verse. Please check your spelling and try again.`
            }, { quoted: msg });
        }
    }
};
