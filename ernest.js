// ernest.js
import dotenv from "dotenv";
dotenv.config();

import pkg from "baileys-x";
const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    jidNormalizedUser
} = pkg;
import pino from "pino";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { messageHandler, loadCommands, commandMap } from "./handlers/messageHandler.js";
import express from "express";
import { initScheduler } from './lib/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
    AUTH_FOLDER: join(__dirname, "data", "auth_state"),
    LOG_FILE: join(__dirname, "bot.log"),
    MAX_RETRIES: 5,
    RETRY_DELAY: 5000,
    PORT: process.env.PORT || 3000,
    BOT_VERSION: process.env.BOT_VERSION || "2.1.0"
};

const logger = pino({
    level: process.env.LOG_LEVEL || "debug",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    },
});

async function ensureAuthFolder() {
    try {
        await fs.mkdir(config.AUTH_FOLDER, { recursive: true });
        logger.info("📁 Auth folder ensured.");
    } catch (err) {
        logger.error("❌ Failed to create auth folder:", err);
        process.exit(1);
    }
}

async function initializeSession() {
    logger.info("🔑 Initializing WhatsApp session...");
    if (!process.env.WHATSAPP_SESSION) {
        logger.error("❌ WHATSAPP_SESSION environment variable not set. Please provide it.");
        throw new Error("WHATSAPP_SESSION environment variable not set");
    }

    try {
        const decoded = Buffer.from(process.env.WHATSAPP_SESSION, "base64").toString("utf-8");
        const session = JSON.parse(decoded);
        const credsPath = join(config.AUTH_FOLDER, "creds.json");
        await fs.writeFile(credsPath, JSON.stringify(session, null, 2));
        logger.info("✅ Session initialized from environment variable.");
        return true;
    } catch (err) {
        logger.error("❌ Session initialization failed. Check WHATSAPP_SESSION format:", err);
        throw err;
    }
}

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.retryCount = 0;
        this.app = express();
    }

    async start() {
        logger.info("🚀 Starting Ernest Tech House Bot...");
        try {
            await ensureAuthFolder();
            const credsPath = join(config.AUTH_FOLDER, "creds.json");
            const credsExist = await fs.access(credsPath).then(() => true).catch(() => false);
            if (!credsExist) {
                 await initializeSession();
            } else {
                 logger.info("Credentials found, skipping session initialization from WHATSAPP_SESSION.");
            }
            
            // Load commands before connecting so commandMap is ready.
            await loadCommands();

            this.setupExpressServer();
            await this.connectWhatsApp();

        } catch (err) {
            logger.error("💥 Bot startup failed:", err);
            await this.handleRetry();
        }
    }

    setupExpressServer() {
        logger.info(`🌐 Initializing health check server on port ${config.PORT}...`);
        this.app.get("/health", (req, res) => {
            res.status(200).json({
                status: "running",
                connected: !!this.sock
            });
        });

        this.app.listen(config.PORT, () => {
            logger.info(`✅ Health server listening on port ${config.PORT}.`);
        });
    }

    async connectWhatsApp() {
        logger.info("🤝 Connecting to WhatsApp...");
        const { state, saveCreds } = await useMultiFileAuthState(config.AUTH_FOLDER);
        this.sock = makeWASocket({
            auth: state,
            logger: pino({ level: "silent" }),
            browser: Browsers.macOS("Desktop"),
            printQRInTerminal: false,
            shouldSyncHistoryMessage: () => false,
            syncFullHistory: false,
            markOnlineOnConnect: process.env.ALWAYS_ONLINE === 'true'
        });

        this.setupEventHandlers(saveCreds);
        messageHandler(this.sock); 
        initScheduler(this.sock);

        logger.info("✅ WhatsApp connection initialized. Awaiting 'open' status...");
    }

    setupEventHandlers(saveCreds) {
        logger.info("⚙️ Setting up WhatsApp event handlers...");
        this.sock.ev.on("connection.update", async (update) => {
            if (update.connection === "close") {
                await this.handleDisconnection(update.lastDisconnect);
            }

            if (update.connection === "open") {
                await this.handleSuccessfulConnection();
            }
        });
        this.sock.ev.on("creds.update", saveCreds);
        logger.info("✅ Event handlers registered.");
    }

    async handleDisconnection(lastDisconnect) {
        const code = lastDisconnect?.error?.output?.statusCode ||
                     lastDisconnect?.error?.output?.payload?.statusCode;
        logger.warn(`Connection closed (Code: ${code || "unknown"})`);

        if (code === DisconnectReason.loggedOut) {
            logger.error("Session logged out. ⚠️ Please generate a new WHATSAPP_SESSION.");
            try {
                await fs.unlink(join(config.AUTH_FOLDER, "creds.json"));
                logger.info("Deleted old creds.json. Please restart bot to generate new session.");
            } catch (err) {
                logger.error("Failed to delete creds.json:", err);
            }
            return;
        }
        await this.handleRetry();
    }

    async handleSuccessfulConnection() {
        this.retryCount = 0;
        const user = this.sock.user;
        logger.info(`✅ Bot connected as ${user?.id?.split(':')[0] || "unknown"}!`);

        try {
            await this.sendConnectionNotification(user.id);
        } catch (err) {
            logger.error("❌ Failed to send connection notification:", err);
        }
    }

    async sendConnectionNotification(userId) {
        // Log the raw OWNER_NUMBER from the .env file for verification.
        logger.info(`Checking OWNER_NUMBER from .env: ${process.env.OWNER_NUMBER}`);
        
        const ownerJid = process.env.OWNER_NUMBER ? jidNormalizedUser(process.env.OWNER_NUMBER.split('@')[0]) : null;

        if (!ownerJid) {
            logger.warn("OWNER_NUMBER not set or invalid in .env. Skipping connection notification.");
            return;
        }

        const botName = "ACEPHAR";
        const totalCommandsLoaded = Object.keys(commandMap).length; 

        const message = `
Hello *User*! 👋 Thanks for choosing *ACEPHAR Bot* by Ernest Tech House.

This bot is featured as *Premium* because of its extensive commands! We have *${totalCommandsLoaded}* commands available.

While the *Premium subscription* will allow you to get a taste of the whole list of commands, the *Freemium version* still has some commands you can use.

Type *${(process.env.COMMAND_PREFIX || '!')}help* to see available commands.

🌐 *Connect with Ernest Tech House:*
➡️ WhatsApp Channel: https://whatsapp.com/channel/0029VayK4ty7DAWr0jeCZx0i
➡️ WhatsApp Group: https://chat.whatsapp.com/FAJjIZY3a09Ck73ydqMs4E?mode=ac_t
➡️ Telegram Channel: https://t.me/ernesttechhouse
➡️ Telegram Group: https://t.me/+ezuV3FulOsg4ZTRk
        `.trim();

        await this.sock.sendMessage(ownerJid, { text: message });
        logger.info("✅ Sent bot connection notification to owner.");
    }

    async handleRetry() {
        if (this.retryCount < config.MAX_RETRIES) {
            this.retryCount++;
            logger.warn(`🔄 Retrying connection (${this.retryCount}/${config.MAX_RETRIES})...`);
            setTimeout(() => this.start(), config.RETRY_DELAY);
        } else {
            logger.error("❌ Max retries reached. Shutting down.");
            process.exit(1);
        }
    }

    async cleanup() {
        logger.info("🧹 Initiating bot cleanup...");
        if (this.sock) {
            try {
                await this.sock.end();
                this.sock.ev.removeAllListeners();
                logger.info("✅ WhatsApp socket closed.");
            } catch (err) {
                logger.error("❌ Cleanup error:", err);
            }
        }
    }
}

process.on("SIGINT", async () => {
    logger.info("🛑 SIGINT received. Shutting down gracefully...");
    await bot.cleanup();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    logger.info("🛑 SIGTERM received. Shutting down gracefully...");
    await bot.cleanup();
    process.exit(0);
});

const bot = new WhatsAppBot();
bot.start().catch(err => {
    logger.error("💥 Fatal error during bot startup:", err);
    process.exit(1);
});