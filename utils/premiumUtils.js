// src/utils/premiumUtils.js
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { jidNormalizedUser } from 'baileys-x';
import pino from 'pino';
import dotenv from "dotenv";
dotenv.config();

const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } }).child({ module: 'premiumUtils' });

const PREMIUM_CACHE_FILE = './data/premium_cache.json';
const EXTERNAL_API_URL = process.env.EXTERNAL_PREMIUM_API_URL;
console.log({EXTERNAL_API_URL});
let premiumCache = new Map();

export async function refreshPremiumStatusCache(sock, ownerJid) {
    if (!EXTERNAL_API_URL) {
        logger.warn('EXTERNAL_PREMIUM_API_URL is not set. Skipping premium status refresh.');
        return;
    }

    const oldCache = new Map(premiumCache);
    let newPremiumNumbers = [];

    try {
        logger.info('🔄 Fetching premium user list from external API...');
        const response = await fetch(`${EXTERNAL_API_URL}/premiumlist`);
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}: ${await response.text()}`);
        }

        // The API now returns an object with a 'users' key
        const data = await response.json();
        const premiumUsers = data.users || [];
        
        premiumCache.clear();
        for (const user of premiumUsers) {
            // The API returns the number, not the full JID
            premiumCache.set(user.number, {
                number: user.number,
                expiry: user.expiry
            });
            newPremiumNumbers.push(user.number);
        }
        
        await fs.writeFile(PREMIUM_CACHE_FILE, JSON.stringify(Object.fromEntries(premiumCache), null, 2));
        logger.info(`✅ Successfully refreshed premium cache. Found ${premiumCache.size} premium users.`);

        // --- Send Notifications for Status Changes ---
        // Find newly added users
        for (const number of newPremiumNumbers) {
            if (!oldCache.has(number)) {
                const expiryDate = new Date(premiumCache.get(number).expiry).toLocaleDateString();
                const welcomeMessage = `👑 *Premium Account Activated* 👑\n\nHey there! Your premium access has been activated and will expire on *${expiryDate}*. Enjoy our exclusive premium commands!`;
                
                try {
                    await sock.sendMessage(jidNormalizedUser(`${number}@s.whatsapp.net`), { text: welcomeMessage });
                    logger.info(`✅ Sent premium welcome message to newly added user: ${number}`);
                } catch (err) {
                    logger.error(`❌ Failed to send premium welcome message to ${number}:`, err);
                }
            }
        }

        // Find expired users
        for (const [number, user] of oldCache.entries()) {
            if (!premiumCache.has(number)) {
                const expiredMessage = `💔 *Premium Access Expired* 💔\n\nYour premium subscription has expired. You can renew your subscription to continue using our exclusive commands.`;
                try {
                    await sock.sendMessage(jidNormalizedUser(`${number}@s.whatsapp.net`), { text: expiredMessage });
                    logger.info(`❌ Sent premium expired message to user: ${number}`);
                } catch (err) {
                    logger.error(`❌ Failed to send premium expired message to ${number}:`, err);
                }
            }
        }

    } catch (error) {
        logger.error('❌ Error refreshing premium cache:', error);
    }
}

export async function loadPremiumCacheFromFile() {
    try {
        if (existsSync(PREMIUM_CACHE_FILE)) {
            const data = await fs.readFile(PREMIUM_CACHE_FILE, 'utf-8');
            premiumCache = new Map(Object.entries(JSON.parse(data)));
            logger.info(`💾 Loaded premium cache from file. Found ${premiumCache.size} entries.`);
        }
    } catch (error) {
        logger.error('❌ Error loading premium cache from file:', error);
    }
}

export function isPremiumUser(jid) {
    const number = jid.split('@')[0];
    return premiumCache.has(number);
}