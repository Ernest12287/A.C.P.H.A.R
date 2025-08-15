import fetch from 'node-fetch';

export default {
    name: 'lookupartist',
    aliases: ['artistinfo'],
    description: 'Looks up detailed information for an artist by their MBID.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Music',

    /**
     * Executes the lookupartist command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command.
     */
    async execute(sock, message, args) {
        const from = message.key.remoteJid;
        const msg = message;

        if (args.length === 0) {
            return await sock.sendMessage(from, {
                text: "🎶 Please provide an artist's MBID to look up. \n\n*Example:*\n!lookupartist b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d"
            }, { quoted: msg });
        }

        const mbid = args[0];
        const apiUrl = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=releases&fmt=json`;
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
                        text: `❌ Artist with MBID \`${mbid}\` not found.`
                    }, { quoted: msg });
                }
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();
            
            let responseText = `🎸 *Artist Information for "${data.name}"*\n\n`;
            responseText += `*Name:* ${data.name}\n`;
            responseText += `*Country:* ${data.country || 'N/A'}\n`;
            responseText += `*Life Span:* ${data['life-span']?.begin || 'N/A'} - ${data['life-span']?.end || 'Present'}\n`;
            if (data.disambiguation) {
                responseText += `*Disambiguation:* ${data.disambiguation}\n`;
            }
            responseText += `*MBID:* \`${data.id}\`\n\n`;

            if (data.releases && data.releases.length > 0) {
                responseText += `*Some Releases:*\n`;
                const maxReleases = 5;
                for (let i = 0; i < Math.min(data.releases.length, maxReleases); i++) {
                    const release = data.releases[i];
                    responseText += `• ${release.title}\n`;
                }
                if (data.releases.length > maxReleases) {
                    responseText += `_...and more._`;
                }
            } else {
                responseText += `_No releases found._`;
            }

            await sock.sendMessage(from, { text: responseText }, { quoted: msg });

        } catch (error) {
            console.error('MusicBrainz API Error:', error);
            await sock.sendMessage(from, {
                text: '❌ An error occurred while fetching artist details. Please check the MBID and try again later.'
            }, { quoted: msg });
        }
    }
};
