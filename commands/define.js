// src/commands/tools/define.js
import axios from 'axios';

export default {
    name: 'define',
    aliases: ['def', 'dictionary'],
    description: 'Define a word using dictionary API. Usage: !define <word>',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Tools', // New category

    /**
     * Executes the define command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (word).
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const word = args.join(' ').trim();

        if (!word) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a word to define. Example: \`${context.commandPrefix}define ephemeral\`` }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: `📚 Searching definition for "*${word}*"...` }, { quoted: message });

            const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            const entry = response.data[0];

            let definitionText = `📚 *Definition of "${entry.word}"*\n`;

            // Include phonetics if available
            if (entry.phonetics?.length) {
                const phonetic = entry.phonetics.find(p => p.text)?.text;
                if (phonetic) definitionText += `🗣️ Pronunciation: _${phonetic}_\n`;
            }

            definitionText += '\n';

            entry.meanings.forEach((meaning, index) => {
                definitionText += `*${index + 1}. ${meaning.partOfSpeech}*\n`;
                meaning.definitions.slice(0, 3).forEach((def, i) => { // Limit to 3 definitions per part of speech
                    definitionText += `   • ${def.definition}\n`;
                    if (def.example) {
                        definitionText += `     _Example_: "${def.example}"\n`;
                    }
                });
                definitionText += '\n';
            });

            await sock.sendMessage(chatId, { text: definitionText.trim() }, { quoted: message });
            logger.info(`Definition found for "${word}" and sent to ${chatId}.`);

        } catch (error) {
            logger.error(`Error fetching definition for "${word}":`, error?.response?.data || error.message);
            await sock.sendMessage(chatId, {
                text: `❌ *Definition Error*\n\nCouldn't find definition for "*${word}*".\n\nTry a simpler word or check spelling.`,
            }, { quoted: message });
        }
    },
};