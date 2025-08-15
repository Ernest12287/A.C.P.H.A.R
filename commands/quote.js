// src/commands/utility/quote.js

import axios from 'axios';

export default {
    name: 'quote',
    aliases: ['quotable', 'wisdom'],
    description: 'Fetches a random inspirational quote.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the quote command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     */
    async execute(sock, message) {
        const from = message.key.remoteJid;
        const msg = message;

        try {
            const response = await axios.get('https://api.quotable.io/quotes/random');
            const quoteData = response.data[0];

            if (!quoteData) {
                return await sock.sendMessage(from, { text: '🚫 Failed to fetch a quote. Please try again later.' }, { quoted: msg });
            }

            const quoteText = quoteData.content;
            const author = quoteData.author;
            const tags = quoteData.tags.join(', ');

            const replyText = `
╔═════.📜.═════╗
  「 ɪɴsᴘɪʀᴀᴛɪᴏɴᴀʟ ǫᴜᴏᴛᴇ 」
╚═════.📜.═════╝

_"${quoteText}"_
~ *${author}*

_Tags: ${tags || 'N/A'}_
`;
            await sock.sendMessage(from, { text: replyText.trim() }, { quoted: msg });

        } catch (err) {
            console.error("❌ Error fetching quote:", err);
            await sock.sendMessage(from, { 
                text: `🚫 An error occurred while fetching a quote: ${err.message}` 
            }, { quoted: msg });
        }
    },
};
