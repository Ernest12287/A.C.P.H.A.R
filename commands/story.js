// src/commands/fun/story.js

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const storiesFilePath = join(__dirname, '../../data/stories.json');

// Ensure the stories.json file and its containing folder exist
async function ensureStoriesFileExists() {
    try {
        await fs.access(storiesFilePath);
    } catch (e) {
        // If the file doesn't exist, check if the directory exists, and create it if not
        const dir = dirname(storiesFilePath);
        try {
            await fs.access(dir);
        } catch (dirError) {
            await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(storiesFilePath, '[]', 'utf-8');
    }
}

// Helper function to create the inactivity timer
function createStoryTimer(sock, chatId, interactiveSessions) {
    return setTimeout(async () => {
        const session = interactiveSessions.get(chatId);
        if (session?.type === 'story') {
            await sock.sendMessage(chatId, {
                text: `⏳ *Time's up!* The story has been paused due to inactivity. To continue a saved story, use \`.storycont <ID>\`.`
            });
            interactiveSessions.delete(chatId); // Clear the session
        }
    }, 60000); // 60-second timer (1 minute is more reasonable than 10 seconds for a group game)
}

// Helper function to get a random story starter
function getRandomStoryStarter() {
    const starters = [
        "It was a Monday morning...",
        "The old lighthouse keeper saw a strange light in the distance.",
        "Suddenly, the ground started to shake...",
        "A mysterious package appeared on the doorstep with no return address.",
        "The final exam was about to begin, but the answers were already written on the board.",
    ];
    return starters[Math.floor(Math.random() * starters.length)];
}

// Core command definition
export default {
    name: 'story',
    aliases: ['storycont', 'storysave', 'storycreate'],
    description: 'Starts and manages a collaborative storytelling game.',
    isPremium: false,
    groupOnly: true,
    privateOnly: false,
    adminOnly: false,
    category: 'Fun',

    async execute(sock, message, args, logger, { interactiveSessions }) {
        const chatId = message.key.remoteJid;
        const senderName = message.pushName || "Storyteller";
        const msg = message;

        await ensureStoriesFileExists();

        const subCommand = args[0]?.toLowerCase();

        // Check if a story session is already active in this chat
        if (interactiveSessions.get(chatId)?.type === 'story') {
            // Allow the save command to be used during an active session
            if (subCommand === 'save' && interactiveSessions.get(chatId).lastMessage?.key.remoteJid === chatId) {
                return this.saveStory(sock, chatId, msg, interactiveSessions.get(chatId), interactiveSessions);
            }
            return await sock.sendMessage(chatId, { text: 'A story game is already in progress in this chat. Use `.storysave` to save and end it.' }, { quoted: msg });
        }
        
        // Handle `storycont` command
        if (subCommand === 'cont' || subCommand === 'continue') {
            const storyId = args[1];
            if (!storyId) {
                return await sock.sendMessage(chatId, { text: 'Please provide a story ID to continue. Example: `.storycont 1`' }, { quoted: msg });
            }
            return this.continueStory(sock, chatId, msg, interactiveSessions, storyId);
        }

        // Handle `storysave` command when no session is active (informational)
        if (subCommand === 'save') {
             return await sock.sendMessage(chatId, { text: 'To save a story, a game must be in progress. Use `.storysave` as a reply to the last line of the story.' }, { quoted: msg });
        }

        // Default behavior: Start a new story game
        this.startNewStory(sock, chatId, msg, senderName, interactiveSessions);
    },

    /**
     * Handles replies to the story session.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {object} session - The active session data.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async handleReply(sock, message, session, logger) {
        const chatId = message.key.remoteJid;
        const msg = message;
        const senderName = message.pushName || "User";
        const replyText = message.message?.conversation || message.message?.extendedTextMessage?.text;

        if (!replyText || msg.key.id === session.lastMessage.key.id) {
            return;
        }

        // Handle the save command
        if (replyText.toLowerCase().startsWith('.storysave') || replyText.toLowerCase().startsWith('.story save')) {
            // Clear the timer and save the story
            clearTimeout(session.timeout);
            return this.saveStory(sock, chatId, msg, session, context.interactiveSessions);
        }

        // Check if the user replied to the correct message
        if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId !== session.lastMessage.key.id) {
            // It's possible the user replied to a different message. We can ignore it silently.
            return;
        }

        // Add the new line to the story data
        session.storyData.push({
            author: senderName,
            text: replyText,
        });

        const storyLine = `*${senderName}:* "${replyText}"`;
        const sentMessage = await sock.sendMessage(chatId, { text: storyLine }, { quoted: session.lastMessage });
        session.lastMessage = sentMessage;

        // Reset the timer
        clearTimeout(session.timeout);
        session.timeout = createStoryTimer(sock, chatId, context.interactiveSessions);
    },

    // --- New, refactored functions ---

    async startNewStory(sock, chatId, msg, senderName, interactiveSessions) {
        const storyStart = getRandomStoryStarter();
        const startText = `
╔═════.📖.═════╗
  「 sᴛᴏʀʏ ɢᴀᴍᴇ 」
╚═════.📖.═════╝

*Story game started!* To participate, reply to the last message of the story with your part.

*Timer:* 60 seconds per turn.
*To end and save:* Reply with \`.storysave\`.

*The story begins...*
*${senderName}:* "${storyStart}"
`;
        const sentMessage = await sock.sendMessage(chatId, { text: startText.trim() }, { quoted: msg });

        // Initialize the story session
        interactiveSessions.set(chatId, {
            type: 'story',
            currentLine: storyStart,
            storyData: [{
                author: senderName,
                text: storyStart,
            }],
            lastMessage: sentMessage,
            timeout: createStoryTimer(sock, chatId, interactiveSessions),
        });
    },

    async saveStory(sock, chatId, msg, session, interactiveSessions) {
        clearTimeout(session.timeout);

        try {
            const fileData = await fs.readFile(storiesFilePath, 'utf-8');
            const stories = JSON.parse(fileData);

            const newStory = {
                id: stories.length + 1,
                date: new Date().toISOString(),
                participants: [...new Set(session.storyData.map(p => p.author))],
                lines: session.storyData,
            };

            stories.push(newStory);
            await fs.writeFile(storiesFilePath, JSON.stringify(stories, null, 2), 'utf-8');

            const storySummary = newStory.lines.map(line => `${line.author}: "${line.text}"`).join('\n');
            await sock.sendMessage(chatId, { text: `📖 *Story Saved!* 📖\n\n*ID:* ${newStory.id}\n*Participants:* ${newStory.participants.join(', ')}\n\n*Summary:*\n${storySummary}` }, { quoted: msg });

            interactiveSessions.delete(chatId);
        } catch (err) {
            console.error('Error saving story:', err);
            await sock.sendMessage(chatId, { text: `🚫 An error occurred while saving the story.` }, { quoted: msg });
        }
    },

    async continueStory(sock, chatId, msg, interactiveSessions, storyId) {
        try {
            const fileData = await fs.readFile(storiesFilePath, 'utf-8');
            const stories = JSON.parse(fileData);
            const storyToContinue = stories.find(story => story.id === parseInt(storyId));

            if (!storyToContinue) {
                return await sock.sendMessage(chatId, { text: `❌ Story with ID *${storyId}* not found.` }, { quoted: msg });
            }

            const lastLine = storyToContinue.lines[storyToContinue.lines.length - 1];
            const continuationText = `
╔═════.📖.═════╗
  「 sᴛᴏʀʏ ᴄᴏɴᴛɪɴᴜᴀᴛɪᴏɴ 」
╚═════.📖.═════╝

*Continuing story ID ${storyToContinue.id}*
*The last line was:* "${lastLine.text}"

*Your turn to reply!*

_To end and save, reply with \`.storysave\`._
`;
            const sentMessage = await sock.sendMessage(chatId, { text: continuationText.trim() }, { quoted: msg });

            interactiveSessions.set(chatId, {
                type: 'story',
                currentLine: lastLine.text,
                storyData: storyToContinue.lines,
                lastMessage: sentMessage,
                timeout: createStoryTimer(sock, chatId, interactiveSessions),
            });
        } catch (err) {
            console.error('Error continuing story:', err);
            await sock.sendMessage(chatId, { text: `🚫 An error occurred while continuing the story.` }, { quoted: msg });
        }
    },
};