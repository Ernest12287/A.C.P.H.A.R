import fetch from 'node-fetch';

export default {
    name: 'lookuprelease',
    aliases: ['tracklist'],
    description: 'Looks up detailed information for a release by its MBID, including its tracklist.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Music',

    /**
     * Executes the lookuprelease command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;

        if (args.length === 0) {
            return await sock.sendMessage(from, {
                text: "🎶 Please provide a release's MBID to look up. \n\n*Example:*\n!tracklist 236e788e-73c3-4c91-9e81-d1c1a5b8433d"
            }, { quoted: msg });
        }

        const mbid = args[0];
        const apiUrl = `https://musicbrainz.org/ws/2/release/${mbid}?inc=recordings&fmt=json`;
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
                        text: `❌ Release with MBID \`${mbid}\` not found.`
                    }, { quoted: msg });
                }
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();
            
            let responseText = `💿 *Release: ${data.title}*\n\n`;
            if (data['artist-credit'] && data['artist-credit'][0]) {
                responseText += `*Artist:* ${data['artist-credit'][0].name}\n`;
            }
            responseText += `*Type:* ${data['release-group']['primary-type']}\n`;
            responseText += `*Date:* ${data.date}\n`;
            responseText += `*MBID:* \`${data.id}\`\n\n`;
            
            const media = data.media?.[0];
            if (media && media.tracks && media.tracks.length > 0) {
                responseText += `*Tracklist:* \n`;
                media.tracks.forEach(track => {
                    const duration = Math.floor(track.length / 1000);
                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    responseText += `• ${track.position}. ${track.title} (${minutes}:${seconds < 10 ? '0' : ''}${seconds})\n`;
                });
            } else {
                responseText += `_Tracklist not available._`;
            }

            await sock.sendMessage(from, { text: responseText }, { quoted: msg });

        } catch (error) {
            console.error('MusicBrainz API Error:', error);
            await sock.sendMessage(from, {
                text: '❌ An error occurred while fetching release details. Please check the MBID and try again later.'
            }, { quoted: msg });
        }
    }
};
