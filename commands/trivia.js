// src/commands/fun/trivia.js

import axios from 'axios';
import he from 'he'; // HTML entity decoder

export default {
    name: 'trivia',
    aliases: ['quiz', 'q'],
    description: 'Starts a trivia game with a random question. The first person to answer correctly wins!',
    isPremium: false,
    groupOnly: true, // Only makes sense in a group chat
    privateOnly: false,
    adminOnly: false,
    category: 'Fun',

    /**
     * Executes the trivia command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context provided by the message handler.
     */
    async execute(sock, message, args, logger, { interactiveSessions }) {
        const from = message.key.remoteJid;
        const msg = message;

        try {
            const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
            const triviaData = response.data.results[0];

            if (!triviaData) {
                return await sock.sendMessage(from, { text: '🚫 Failed to fetch a trivia question. Please try again later.' }, { quoted: msg });
            }

            const question = he.decode(triviaData.question);
            const correctAnswer = he.decode(triviaData.correct_answer);
            const incorrectAnswers = triviaData.incorrect_answers.map(ans => he.decode(ans));
            
            const allAnswers = [correctAnswer, ...incorrectAnswers].sort(() => Math.random() - 0.5);

            let questionText = `
╔═════.🧠.═════╗
  「 ᴛʀɪᴠɪᴀ ᴛɪᴍᴇ 」
╚═════.🧠.═════╝

*Category:* ${he.decode(triviaData.category)}
*Difficulty:* ${he.decode(triviaData.difficulty)}

*❓ ǫᴜᴇsᴛɪᴏɴ:*
${question}

*Choose the correct answer:*
${allAnswers.map((ans, index) => `  *${String.fromCharCode(65 + index)}.* ${ans}`).join('\n')}

_You have 30 seconds! Reply with the letter of your choice (e.g., A)._
`;
            
            await sock.sendMessage(from, { text: questionText.trim() }, { quoted: msg });

            // Store the correct answer and a timer in the interactive sessions
            interactiveSessions.set(from, {
                type: 'trivia',
                correctAnswer: correctAnswer,
                allAnswers: allAnswers,
                timestamp: Date.now(),
                timeout: setTimeout(async () => {
                    if (interactiveSessions.get(from)?.type === 'trivia') {
                        await sock.sendMessage(from, { 
                            text: `⏳ *Time's up!* The correct answer was: *${correctAnswer}*`
                        });
                        interactiveSessions.delete(from);
                    }
                }, 30000) // 30-second timer
            });

        } catch (err) {
            console.error("❌ Error fetching trivia question:", err);
            await sock.sendMessage(from, { 
                text: `🚫 An error occurred while fetching a trivia question: ${err.message}` 
            }, { quoted: msg });
        }
    },

    /**
     * Handles replies to the trivia session.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {object} session - The active session data.
     * @param {object} logger - The logger instance.
     */
    async handleReply(sock, message, session, logger) {
        const from = message.key.remoteJid;
        const msg = message;
        const senderName = message.pushName || "Player";
        const replyText = message.message.conversation || message.message.extendedTextMessage?.text;

        if (!replyText) return;

        const answerIndex = replyText.trim().toUpperCase().charCodeAt(0) - 65;
        const submittedAnswer = session.allAnswers[answerIndex];

        if (submittedAnswer && submittedAnswer === session.correctAnswer) {
            await sock.sendMessage(from, { 
                text: `🎉 *Congratulations, ${senderName}!* You got it right! The answer was indeed *${session.correctAnswer}*!`
            });
            clearTimeout(session.timeout);
            session.type = null; // End the session
        } else {
            await sock.sendMessage(from, { 
                text: `❌ *${senderName}*, that's not the correct answer. Try again!`
            });
        }
    }
};
