import fetch from 'node-fetch';

export default {
    name: 'searchrecording',
    aliases: ['song'],
    description: 'Searches for a recording (song) by title.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Music',

    /**
     * Executes the searchrecording command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;

        if (args.length === 0) {
            return await sock.sendMessage(from, {
                text: "🎶 Please provide a song title to search for. \n\n*Example:*\n!song Yesterday"
            }, { quoted: msg });
        }

        const query = args.join(' ');
        const apiUrl = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json`;
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
            const recordings = data.recordings;

            if (!recordings || recordings.length === 0) {
                return await sock.sendMessage(from, {
                    text: `❌ No songs found for "${query}".`
                }, { quoted: msg });
            }

            let responseText = `🔎 *MusicBrainz Song Search Results for "${query}"*\n\n`;
            
            const maxResults = 5;
            for (let i = 0; i < Math.min(recordings.length, maxResults); i++) {
                const recording = recordings[i];
                responseText += `*Title:* ${recording.title}\n`;
                if (recording['artist-credit'] && recording['artist-credit'][0]) {
                    responseText += `*Artist:* ${recording['artist-credit'][0].name}\n`;
                }
                if (recording.disambiguation) {
                    responseText += `*Disambiguation:* ${recording.disambiguation}\n`;
                }
                responseText += `*MBID:* \`${recording.id}\`\n\n`;
            }

            if (recordings.length > maxResults) {
                responseText += `_Showing ${maxResults} of ${recordings.length} results. Please be more specific to narrow down the search._`;
            }

            await sock.sendMessage(from, { text: responseText }, { quoted: msg });

        } catch (error) {
            console.error('MusicBrainz API Error:', error);
            await sock.sendMessage(from, {
                text: '❌ An error occurred while searching for the song. Please try again later.'
            }, { quoted: msg });
        }
    }
};
