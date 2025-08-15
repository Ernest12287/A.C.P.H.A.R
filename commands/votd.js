import fetch from 'node-fetch';

export default {
    name: 'votd',
    aliases: ['verseoftheday', 'dailyverse'],
    description: 'Fetches a random verse of the day.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Religion',

    /**
     * Executes the VotD command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message) {
        const from = message.key.remoteJid;
        const msg = message;

        const apiUrl = `https://bible-api.com/data/web/random`;

        try {
            // Fetch the random verse from the API
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
            const responseText = `📅 *Verse of the Day*\n\n` +
                                 `📖 *${data.reference}*\n\n` +
                                 `${data.text}\n\n` +
                                 `_Translation: ${data.translation_name}_`;

            // Send the formatted message back to the user
            await sock.sendMessage(from, {
                text: responseText
            }, { quoted: msg });

        } catch (error) {
            console.error('Verse of the Day command error:', error);
            await sock.sendMessage(from, {
                text: `❌ An error occurred while fetching the verse of the day. Please try again later.`
            }, { quoted: msg });
        }
    }
};
