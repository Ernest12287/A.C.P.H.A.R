// src/commands/utility/os.js

import os from 'os';
import { exec } from 'child_process';
import util from 'util';

// Promisify exec for async/await usage
const execPromise = util.promisify(exec);

export default {
    name: 'os',
    aliases: ['system', 'sysinfo', 'serverinfo'],
    description: 'Displays detailed information about the operating system and server.',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: true, // This command is restricted to group admins
    category: 'user',

    /**
     * Executes the os command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     */
    async execute(sock, message) {
        const from = message.key.remoteJid;
        const msg = message;

        try {
            // --- OS & System Information ---
            const osInfo = {
                type: os.type(),
                platform: os.platform(),
                release: os.release(),
                hostname: os.hostname(),
                architecture: os.arch(),
                uptime: this.formatUptime(os.uptime()),
            };

            // --- CPU Information ---
            const cpus = os.cpus();
            const cpuInfo = {
                model: cpus[0].model,
                cores: cpus.length,
                speed: `${(cpus[0].speed / 1000).toFixed(2)} GHz`,
            };

            // --- Memory (RAM) Information ---
            const totalMemBytes = os.totalmem();
            const freeMemBytes = os.freemem();
            const usedMemBytes = totalMemBytes - freeMemBytes;

            const memInfo = {
                total: `${(totalMemBytes / (1024 ** 3)).toFixed(2)} GB`,
                used: `${(usedMemBytes / (1024 ** 3)).toFixed(2)} GB`,
                free: `${(freeMemBytes / (1024 ** 3)).toFixed(2)} GB`,
            };

            // --- Storage (Disk) Information ---
            let diskInfo = '❓ _Disk usage info not available. Install `check-disk-space` package._';
            try {
                const diskPath = os.platform() === 'win32' ? 'C:' : '/';
                const { default: checkDiskSpace } = await import('check-disk-space');
                const diskSpace = await checkDiskSpace(diskPath);

                const totalDiskGB = (diskSpace.size / (1024 ** 3)).toFixed(2);
                const freeDiskGB = (diskSpace.free / (1024 ** 3)).toFixed(2);
                const usedDiskGB = (totalDiskGB - freeDiskGB).toFixed(2);

                diskInfo = `
   - *Total:* ${totalDiskGB} GB
   - *Used:* ${usedDiskGB} GB
   - *Free:* ${freeDiskGB} GB
                `.trim();
            } catch (diskErr) {
                console.error('Error fetching disk space info:', diskErr);
            }

            // --- Generate the final message text ---
            let replyText = `
╔═.✨.═════════╗
  「 ᴏs & sᴇʀᴠᴇʀ ɪɴғᴏ 」
╚═════════.✨.═╝

*💻 ᴏs ɪɴғᴏʀᴍᴀᴛɪᴏɴ*
╭─━─━─━─━─━─━─━─━─
│ *• ᴛʏᴘᴇ:* ${osInfo.type}
│ *• ᴘʟᴀᴛғᴏʀᴍ:* ${osInfo.platform}
│ *• ʀᴇʟᴇᴀsᴇ:* ${osInfo.release}
│ *• ᴀʀᴄʜɪᴛᴇᴄᴛᴜʀᴇ:* ${osInfo.architecture}
│ *• ʜᴏsᴛɴᴀᴍᴇ:* ${osInfo.hostname}
│ *• ᴜᴘᴛɪᴍᴇ:* ${osInfo.uptime}
╰─━─━─━─━─━─━─━─━─

*🧠 ᴄᴘᴜ ɪɴғᴏʀᴍᴀᴛɪᴏɴ*
╭─━─━─━─━─━─━─━─━─
│ *• ᴍᴏᴅᴇʟ:* ${cpuInfo.model}
│ *• ᴄᴏʀᴇs:* ${cpuInfo.cores}
│ *• sᴘᴇᴇᴅ:* ${cpuInfo.speed}
╰─━─━─━─━─━─━─━─━─

*💾 ᴍᴇᴍᴏʀʏ (ʀᴀᴍ) ᴜsᴀɢᴇ*
╭─━─━─━─━─━─━─━─━─
│ *• ᴛᴏᴛᴀʟ:* ${memInfo.total}
│ *• ᴜsᴇᴅ:* ${memInfo.used}
│ *• ғʀᴇᴇ:* ${memInfo.free}
╰─━─━─━─━─━─━─━─━─

*🗄️ sᴛᴏʀᴀɢᴇ ᴜsᴀɢᴇ*
╭─━─━─━─━─━─━─━─━─
${diskInfo}
╰─━─━─━─━─━─━─━─━─
`;

            await sock.sendMessage(from, { text: replyText.trim() }, { quoted: msg });

        } catch (err) {
            console.error("❌ Error in os command:", err);
            await sock.sendMessage(from, { 
                text: `🚫 An error occurred while fetching system info: ${err.message}` 
            }, { quoted: msg });
        }
    },

    /**
     * Helper function to format uptime from seconds to a readable string.
     * @param {number} uptimeSeconds - The uptime in seconds.
     * @returns {string} - The formatted uptime string.
     */
    formatUptime(uptimeSeconds) {
        const d = Math.floor(uptimeSeconds / (3600 * 24));
        const h = Math.floor(uptimeSeconds % (3600 * 24) / 3600);
        const m = Math.floor(uptimeSeconds % 3600 / 60);
        const s = Math.floor(uptimeSeconds % 60);

        const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
        const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
        const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
        const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";

        return dDisplay + hDisplay + mDisplay + sDisplay;
    }
};
