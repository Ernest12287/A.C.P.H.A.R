// src/commands/utility/repo.js

export default {
    name: 'repo',
    aliases: ['github', 'source'],
    description: 'Displays the link to the bot\'s GitHub repository.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false, // This command is accessible to all users
    category: 'Utility',

    /**
     * Executes the repo command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;

        const repoLink = 'https://github.com/Ernest12287/A.C.P.H.A.R.git';

        const replyText = `
╔═════.🌐.═════╗
  「 ʙᴏᴛ ʀᴇᴘᴏsɪᴛᴏʀʏ 」
╚═════.🌐.═════╝

*Check out the bot's source code on GitHub:*
╭─━─━─━─━─━─━─━─━─
│ *• ɢɪᴛʜᴜʙ:* ${repoLink}
│
│ _Feel free to star the repo!_
╰─━─━─━─━─━─━─━─━─
`;

        try {
            await sock.sendMessage(from, { text: replyText.trim() }, { quoted: msg });
        } catch (err) {
            console.error("❌ Error in repo command:", err);
            await sock.sendMessage(from, { 
                text: `🚫 An error occurred while trying to send the repository link: ${err.message}` 
            }, { quoted: msg });
        }
    },
};
