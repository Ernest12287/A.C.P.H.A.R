import fetch from 'node-fetch';

export default {
    name: 'searchartist',
    aliases: ['artist'],
    description: 'Searches for an artist by name on MusicBrainz.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Music',

    /**
     * Executes the searchartist command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;

        // Ensure there is a query to search for
        if (args.length === 0) {
            return await sock.sendMessage(from, {
                text: "🎶 Please provide an artist name to search for. \n\n*Example:*\n!artist The Beatles"
            }, { quoted: msg });
        }

        const query = args.join(' ');
        const apiUrl = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(query)}&fmt=json`;
        
        // MusicBrainz requires a meaningful User-Agent header and enforces a 1 request/second limit.
        // We will use a unique name for our bot here.
        const userAgent = 'ACEPHAR_Bot/1.0.0 (acephar.netlify.app)'; // Replace with your bot's name and a contact URL
        
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
            const artists = data.artists;

            if (!artists || artists.length === 0) {
                return await sock.sendMessage(from, {
                    text: `❌ No artists found for "${query}".`
                }, { quoted: msg });
            }

            // Build the formatted response string
            let responseText = `🔎 *MusicBrainz Artist Search Results for "${query}"*\n\n`;
            
            // We'll show up to 5 results to keep the message concise
            const maxResults = 5;
            for (let i = 0; i < Math.min(artists.length, maxResults); i++) {
                const artist = artists[i];
                responseText += `*Name:* ${artist.name}\n`;
                if (artist.disambiguation) {
                    responseText += `*Disambiguation:* ${artist.disambiguation}\n`;
                }
                responseText += `*MBID:* \`${artist.id}\`\n\n`;
            }

            if (artists.length > maxResults) {
                responseText += `_Showing ${maxResults} of ${artists.length} results. Please be more specific to narrow down the search._`;
            }

            await sock.sendMessage(from, { text: responseText }, { quoted: msg });

        } catch (error) {
            console.error('MusicBrainz API Error:', error);
            await sock.sendMessage(from, {
                text: '❌ An error occurred while searching for the artist. Please try again later.'
            }, { quoted: msg });
        }
    }
};
