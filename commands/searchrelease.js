import fetch from 'node-fetch';

export default {
    name: 'searchrelease',
    aliases: ['album'],
    description: 'Searches for a release (album/EP/single) by title.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Music',

    /**
     * Executes the searchrelease command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;

        if (args.length === 0) {
            return await sock.sendMessage(from, {
                text: "🎶 Please provide a release title to search for. \n\n*Example:*\n!album Abbey Road"
            }, { quoted: msg });
        }

        const query = args.join(' ');
        const apiUrl = `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(query)}&fmt=json`;
        const userAgent = 'ACEPHAR_Bot/1.0.0 (acephar.netlify.app)';
        
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();
            const releases = data.releases;

            if (!releases || releases.length === 0) {
                return await sock.sendMessage(from, {
                    text: `❌ No releases found for "${query}".`
                }, { quoted: msg });
            }

            let responseText = `🔎 *MusicBrainz Release Search Results for "${query}"*\n\n`;
            
            const maxResults = 5;
            for (let i = 0; i < Math.min(releases.length, maxResults); i++) {
                const release = releases[i];
                responseText += `*Title:* ${release.title}\n`;
                if (release['artist-credit'] && release['artist-credit'][0]) {
                    responseText += `*Artist:* ${release['artist-credit'][0].name}\n`;
                }
                if (release.disambiguation) {
                    responseText += `*Disambiguation:* ${release.disambiguation}\n`;
                }
                responseText += `*MBID:* \`${release.id}\`\n\n`;
            }

            if (releases.length > maxResults) {
                responseText += `_Showing ${maxResults} of ${releases.length} results. Please be more specific to narrow down the search._`;
            }

            await sock.sendMessage(from, { text: responseText }, { quoted: msg });

        } catch (error) {
            console.error('MusicBrainz API Error:', error);
            await sock.sendMessage(from, {
                text: '❌ An error occurred while searching for the release. Please try again later.'
            }, { quoted: msg });
        }
    }
};
