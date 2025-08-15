import fetch from 'node-fetch';

export default {
    name: 'random',
    aliases: ['rand', 'rv'],
    description: 'Fetches a random Bible verse. Can be filtered by book or Testament.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Religion',

    /**
     * Executes the random command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;

        let query = '';
        if (args.length > 0) {
            // Join arguments and capitalize for the API
            const books = args.join(',').toUpperCase();
            query = `/${encodeURIComponent(books)}`;
        }

        const apiUrl = `https://bible-api.com/data/web/random${query}`;

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
            const responseText = `📖 *${data.reference}*\n\n${data.text}\n\n_Translation: ${data.translation_name}_`;

            // Send the formatted message back to the user
            await sock.sendMessage(from, {
                text: responseText
            }, { quoted: msg });

        } catch (error) {
            console.error('Random verse command error:', error);
            await sock.sendMessage(from, {
                text: `❌ An error occurred while fetching a random verse. Please try again later.`
            }, { quoted: msg });
        }
    }
};
