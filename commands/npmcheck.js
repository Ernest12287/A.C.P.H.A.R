// src/commands/utility/npmcheck.js

// Import the necessary library to make HTTP requests.
// 'node-fetch' is a popular choice for this.
import fetch from 'node-fetch';

export default {
    name: 'npmcheck',
    aliases: ['npm', 'package'],
    description: 'Checks for information about a public npm package.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the npmcheck command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const packageToSearch = args[0]; // Get the first argument as the package name.

        // Check if a package name was provided.
        if (!packageToSearch) {
            await sock.sendMessage(chatId, { text: 'Please provide a package name to search. Example: `npmcheck express`' }, { quoted: message });
            return;
        }

        const url = `https://registry.npmjs.org/${packageToSearch}`;

        try {
            // Inform the user that the request is in progress.
            await sock.sendMessage(chatId, { text: `Searching for *${packageToSearch}*...` }, { quoted: message });

            // Make the GET request to the public npm registry.
            const response = await fetch(url);
            
            // Check if the package was not found (HTTP status 404).
            if (response.status === 404) {
                await sock.sendMessage(chatId, { text: `❌ Package *\`${packageToSearch}\`* not found on the npm registry.` }, { quoted: message });
                return;
            }

            // Check for other potential errors (e.g., network issues).
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Parse the JSON data from the response.
            const data = await response.json();

            // Extract the relevant information from the JSON object.
            const latestVersion = data['dist-tags'].latest;
            const description = data.description || 'No description available.';
            const license = data.license || 'Not specified.';
            const author = data.author ? data.author.name : 'Unknown.';
            const homepage = data.homepage || 'No homepage link.';

            // Construct the response message string.
            const reply = `
✨ *NPM Package Info* ✨
-----------------------------
📦 *Package:* \`${data.name}\`
🌐 *Version:* ${latestVersion}
✍️ *Author:* ${author}
📜 *License:* ${license}
📝 *Description:* ${description}
🔗 *Homepage:* ${homepage}

*Powered by ACEPHAR*
            `.trim(); // .trim() removes leading/trailing whitespace.

            // Send the formatted message back to the user.
            await sock.sendMessage(chatId, { text: reply }, { quoted: message });
            logger.info(`NPM check command executed for '${packageToSearch}' in chat ${chatId}.`);

        } catch (error) {
            // Handle any errors that occur during the fetch or parsing process.
            logger.error(`Error fetching npm package info for '${packageToSearch}':`, error);
            await sock.sendMessage(chatId, { text: `An error occurred while fetching package information. Please try again later.` }, { quoted: message });
        }
    },
};