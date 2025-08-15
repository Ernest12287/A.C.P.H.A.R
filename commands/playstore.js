// src/commands/tools/playstore.js
import axios from 'axios';
import * as cheerio from 'cheerio'; // Ensure this is installed: npm install cheerio

// Core Play Store search function
async function searchPlayStore(query) {
    try {
        const { data } = await axios.get(`https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`);
        const results = [];
        const $ = cheerio.load(data);

        // This selector is highly dependent on Google Play Store's current HTML structure
        // It might break if Google changes their page layout.
        $(".ULeU3b > .VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.Y8RQXd > .VfPpkd-aGsRMb > .VfPpkd-EScbFb-JIbuQc.TAQqTe > a").each((i, element) => {
            const link = $(element).attr('href');
            const name = $(element).find(".j2FCNc > .cXFu1 > .ubGTjb > .DdYX5").text();
            const developer = $(element).find(".j2FCNc > .cXFu1 > .ubGTjb > .wMUdtb").text();
            const img = $(element).find(".j2FCNc > img").attr('src');
            const rating = $(element).find(".j2FCNc > .cXFu1 > .ubGTjb > div").attr("aria-label");
            const rating2 = $(element).find(".j2FCNc > .cXFu1 > .ubGTjb > div > span.w2kbF").text();
            const fullLink = "https://play.google.com" + link;

            if (name && developer) {
                results.push({
                    'link': fullLink,
                    'nama': name,
                    'developer': developer,
                    'img': img || "https://placehold.co/100x100/FF0000/FFFFFF?text=No+Image", // Placeholder if no image
                    'rate': rating || "No Rate",
                    'rate2': rating2 || "No Rate",
                    'link_dev': `https://play.google.com/store/apps/developer?id=${encodeURIComponent(developer.split(" ").join('+'))}`
                });
            }
        });

        return results;
    } catch (error) {
        throw error;
    }
}

export default {
    name: 'playstore',
    aliases: ['ps', 'appsearch'],
    description: 'Searches for apps on the Google Play Store. Usage: !playstore <app_name>',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Tools', // New category

    /**
     * Executes the playstore command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (app name).
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `🏪 *Usage Error*\n\nPlease provide an app name to search for. Example: \`${context.commandPrefix}playstore WhatsApp\``
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: `🏪 Searching Play Store for "*${query}*" ...` }, { quoted: message });

            const results = await searchPlayStore(query);

            if (results.length === 0) {
                await sock.sendMessage(chatId, { text: '❌ *Play Store Search Error*\n\nNo apps found for your search. Try a different name.' }, { quoted: message });
                logger.info(`No Play Store results found for "${query}".`);
                return;
            }

            let response = `🏪 *Play Store Results for "${query}"*:\n\n`;

            results.slice(0, 5).forEach((app, index) => { // Limit to top 5 results
                response += `${index + 1}. *${app.nama}*\n`;
                response += `👨‍💻 Developer: ${app.developer}\n`;
                response += `⭐ Rating: ${app.rate2}\n`;
                response += `🔗 Link: ${app.link}\n\n`;
            });

            await sock.sendMessage(chatId, { text: response.trim() }, { quoted: message });
            logger.info(`Play Store results sent for "${query}" to ${chatId}.`);

            // Send app icon of the top result if available
            if (results[0].img && results[0].img !== "https://placehold.co/100x100/FF0000/FFFFFF?text=No+Image") {
                try {
                    await sock.sendMessage(chatId, {
                        image: { url: results[0].img },
                        caption: `📱 *${results[0].nama}* - Top Result Icon`
                    }, { quoted: message });
                } catch (imgError) {
                    logger.warn(`Failed to send Play Store app icon for "${results[0].nama}": ${imgError.message}`);
                }
            }

        } catch (error) {
            logger.error(`Error in !playstore command for "${query}":`, error.message);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nFailed to search Play Store. The service might be temporarily unavailable or the website structure has changed.' }, { quoted: message });
        }
    },
};