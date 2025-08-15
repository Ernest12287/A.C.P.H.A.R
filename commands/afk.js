// src/commands/afk.js

// This map will store AFK users in memory.
// It will be reset every time the bot restarts.
const afkUsers = new Map();

export default {
    name: "afk",
    alias: ["away"],
    desc: "Sets your status to away from keyboard (AFK).",
    category: "utility",
    usage: "<reason>",
    react: "💤",
    
    /**
     * @param {import('baileys-x').WASocket} sock
     * @param {import('baileys-x').proto.IWebMessageInfo} msg
     * @param {string[]} args
     * @param {object} context
     */
    async execute(sock, msg, args, context) {
        const { senderJid, chatId, logger } = context;
        const reason = args.join(" ") || "No reason provided.";

        // If the user is already AFK, turn it off.
        if (afkUsers.has(senderJid)) {
            afkUsers.delete(senderJid);
            await sock.sendMessage(chatId, { text: "Welcome back! Your AFK status has been removed." }, { quoted: msg });
            logger.info(`User ${senderJid} is no longer AFK.`);
            return;
        }

        // Otherwise, set the user to AFK.
        afkUsers.set(senderJid, {
            timestamp: Date.now(),
            reason,
        });

        await sock.sendMessage(chatId, { text: `You are now AFK with reason: ${reason}` }, { quoted: msg });
        logger.info(`User ${senderJid} set AFK status.`);
    },
};
