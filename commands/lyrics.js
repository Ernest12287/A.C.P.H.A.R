import fetch from 'node-fetch';

export default {
    name: 'lyrics',
    aliases: ['lyric', 'l'],
    description: 'Fetches lyrics for a song by artist and title.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Music',

    /**
     * Executes the lyrics command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;

        // Check if both artist and title are provided
        if (args.length < 2) {
            return await sock.sendMessage(from, {
                text: "🎶 Please provide both the artist and song title. \n\n*Example:*\n!lyrics Adele Hello"
            }, { quoted: msg });
        }

        // The first argument is the artist, the rest is the song title
        const artist = args[0];
        const title = args.slice(1).join(' ');

        const apiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
        const userAgent = 'ACEPHAR_Bot/1.0.0 (acephar.netlify.app)';
        
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return await sock.sendMessage(from, {
                        text: `❌ No lyrics found for "${title}" by ${artist}.`
                    }, { quoted: msg });
                }
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();
            
            // The API response contains a single string of lyrics.
            // We format it with the song title and artist for clarity.
            const responseText = `🎤 *Lyrics for "${title}" by ${artist}*\n\n${data.lyrics}`;

            await sock.sendMessage(from, { text: responseText }, { quoted: msg });

        } catch (error) {
            console.error('Lyrics.ovh API Error:', error);
            await sock.sendMessage(from, {
                text: '❌ An error occurred while fetching lyrics. Please check the artist and song title and try again later.'
            }, { quoted: msg });
        }
    }
};
