// src/commands/utility/joke.js

import axios from 'axios';

export default {
    name: 'joke',
    aliases: ['pun', 'lol'],
    description: 'Fetches a random joke to make you laugh.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the joke command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     */
    async execute(sock, message) {
        const from = message.key.remoteJid;
        const msg = message;

        try {
            const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
            const jokeData = response.data;

            if (!jokeData || (!jokeData.setup && !jokeData.joke)) {
                return await sock.sendMessage(from, { text: '🚫 Failed to fetch a joke. The humor server is down.' }, { quoted: msg });
            }

            let replyText;
            if (jokeData.type === 'single') {
                replyText = `
╔═════.😂.═════╗
  「 ʜᴜᴍᴏʀ ᴛɪᴍᴇ 」
╚═════.😂.═════╝

_"${jokeData.joke}"_
`;
            } else {
                replyText = `
╔═════.😂.═════╗
  「 ʜᴜᴍᴏʀ ᴛɪᴍᴇ 」
╚═════.😂.═════╝

*${jokeData.setup}*
...
...
*${jokeData.punchline}*
`;
            }
            
            await sock.sendMessage(from, { text: replyText.trim() }, { quoted: msg });

        } catch (err) {
            console.error("❌ Error fetching joke:", err);
            await sock.sendMessage(from, { 
                text: `🚫 An error occurred while fetching a joke: ${err.message}` 
            }, { quoted: msg });
        }
    },
};
