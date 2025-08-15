// Example Premium Command Template
// src/commands/utility/premium-status.js

export default {
    name: 'premium',
    aliases: ['prem', 'subscription', 'status'],
    category: 'Utility',
    description: 'Check your premium subscription status and benefits',
    usage: '!premium [user]',
    isPremium: false, // This command should be accessible to all users to check their status
    adminOnly: false,
    groupOnly: false,
    privateOnly: false,
    channelOnly: false,
    noChannel: false,

    async execute(sock, msg, args, logger, context) {
        const { 
            isOwner, 
            isPremiumUser, 
            commandPrefix,
            PremiumStyles,
            senderJid,
            chatId 
        } = context;

        try {
            // Show premium typing indicator
            await sock.sendPresenceUpdate('composing', chatId);
            
            // Simulate premium processing time for better UX
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (isPremiumUser) {
                // Premium user status display
                const premiumMessage = `
${PremiumStyles.formatHeader("PREMIUM STATUS VERIFIED", "👑")}
║                                      ║
║ 🎉 *CONGRATULATIONS!*                ║
║ You have PREMIUM ACCESS! 👑          ║
║                                      ║
║ 💎 *Your Premium Benefits:*          ║
║ • ${PremiumStyles.success} Unlimited Command Access        ║
║ • ${PremiumStyles.success} Priority Response System       ║
║ • ${PremiumStyles.success} Advanced AI Features          ║
║ • ${PremiumStyles.success} Exclusive Premium Commands    ║
║ • ${PremiumStyles.success} 24/7 Premium Support          ║
║ • ${PremiumStyles.success} Custom Integrations           ║
║                                      ║
║ 🚀 *Premium Features Unlocked:*      ║
║ • AI Image Generation               ║
║ • Advanced Text Processing          ║
║ • Premium Entertainment             ║
║ • Business Tools & Analytics        ║
║ • Custom Automation                 ║
║                                      ║
${PremiumStyles.formatFooter()}

${PremiumStyles.fire} *Thank you for being a Premium Subscriber!* ${PremiumStyles.fire}

${PremiumStyles.info} *Need Help?* Contact Ernest Tech House Premium Support
${PremiumStyles.rocket} *Explore Commands:* Type \`${commandPrefix}help\` for full command list
                `.trim();

                await sock.sendMessage(chatId, { text: premiumMessage }, { quoted: msg });

            } else {
                // Non-premium user - show upgrade benefits
                const upgradeMessage = `
${PremiumStyles.formatHeader("PREMIUM UPGRADE AVAILABLE", "🔓")}
║                                      ║
║ 📊 *Current Status:* Standard User   ║
║ 🎯 *Available:* Limited Commands     ║
║                                      ║
║ 🚀 *Upgrade to Premium & Unlock:*    ║
║                                      ║
║ ${PremiumStyles.crown} *EXCLUSIVE FEATURES:*             ║
║ • ${PremiumStyles.diamond} 200+ Premium Commands           ║
║ • ${PremiumStyles.lightning} AI-Powered Responses            ║
║ • ${PremiumStyles.rocket} Lightning Fast Processing        ║
║ • ${PremiumStyles.gem} Advanced Media Tools              ║
║ • ${PremiumStyles.fire} Premium Entertainment            ║
║ • ${PremiumStyles.shield} Priority Support                ║
║                                      ║
║ 💰 *PREMIUM PRICING:*                ║
║ • Monthly: $9.99/month               ║
║ • Quarterly: $24.99 (Save 17%)      ║
║ • Yearly: $79.99 (Save 33%)         ║
║                                      ║
║ 🎁 *LIMITED TIME BONUS:*             ║
║ • First month 50% OFF!              ║
║ • Free premium setup                ║
║ • Bonus command packs               ║
║                                      ║
${PremiumStyles.formatFooter()}

${PremiumStyles.sparkles} *Ready to upgrade your experience?* ${PremiumStyles.sparkles}

${PremiumStyles.info} *Contact Ernest Tech House for Premium Access:*
📧 Email: premium@ernesttech.com
📱 WhatsApp: +1234567890
🌐 Website: www.ernesttech.com/premium

${PremiumStyles.rocket} *Type \`${commandPrefix}help\` to see available commands*
                `.trim();

                await sock.sendMessage(chatId, { text: upgradeMessage }, { quoted: msg });
            }

            // Clear typing indicator
            await sock.sendPresenceUpdate('paused', chatId);

        } catch (error) {
            await sock.sendPresenceUpdate('paused', chatId);
            logger.error(`${PremiumStyles.error} Error in premium status command:`, error);
            
            const errorMessage = PremiumStyles.formatError(
                "Premium Status Error",
                "Unable to retrieve premium status at this time. Our premium support team has been notified.",
                `${commandPrefix}premium`
            );
            
            await sock.sendMessage(chatId, { text: errorMessage }, { quoted: msg });
        }
    }
};

// ===================================================================
// ADDITIONAL PREMIUM COMMAND EXAMPLES
// ===================================================================

// Example: Premium Help Command Enhancement
// src/commands/utility/help.js (enhanced version)

export const premiumHelpCommand = {
    name: 'help',
    aliases: ['h', 'commands', 'menu'],
    category: 'Utility',
    description: 'Display all available commands with premium styling',
    usage: '!help [command_name]',
    isPremium: false,
    adminOnly: false,
    groupOnly: false,
    privateOnly: false,

    async execute(sock, msg, args, logger, context) {
        const { 
            isPremiumUser, 
            commandPrefix, 
            PremiumStyles,
            chatId,
            bot 
        } = context;

        try {
            await sock.sendPresenceUpdate('composing', chatId);

            if (args.length > 0) {
                // Show specific command help with premium styling
                const commandName = args[0].toLowerCase();
                const command = bot.commands.get(commandName);
                
                if (command) {
                    const commandHelp = `
${PremiumStyles.formatHeader(`COMMAND: ${command.name.toUpperCase()}`, "📖")}
║                                      ║
║ 📝 *Description:*                    ║
║ ${command.description.padEnd(36)} ║
║                                      ║
║ 💡 *Usage:*                          ║
║ \`${command.usage || `${commandPrefix}${command.name}`}\`${' '.repeat(Math.max(0, 35 - (command.usage || `${commandPrefix}${command.name}`).length))}║
║                                      ║
║ 🏷️ *Category:* ${command.category.padEnd(22)} ║
║ ${command.isPremium ? '👑 *Premium:* Required' : '🆓 *Premium:* Not Required'.padEnd(36)} ║
║ ${command.adminOnly ? '🛡️ *Admin Only:* Yes' : '👥 *Admin Only:* No'.padEnd(36)} ║
║                                      ║
${command.aliases && command.aliases.length > 0 ? `║ 🔗 *Aliases:* ${command.aliases.join(', ').padEnd(23)} ║` : ''}
${PremiumStyles.formatFooter()}

${isPremiumUser ? PremiumStyles.crown + ' *Premium User - Full Access*' : PremiumStyles.info + ' *Upgrade to Premium for more features*'}
                    `.trim();

                    await sock.sendMessage(chatId, { text: commandHelp }, { quoted: msg });
                } else {
                    const notFoundMsg = PremiumStyles.formatError(
                        "Command Not Found",
                        `Command \`${commandName}\` not found in our premium library.\n\n${PremiumStyles.rocket} Use \`${commandPrefix}help\` to see all available commands.`,
                        `${commandPrefix}help ${commandName}`
                    );
                    await sock.sendMessage(chatId, { text: notFoundMsg }, { quoted: msg });
                }
            } else {
                // Show all commands with premium categorization
                const categories = Array.from(bot.categorizedCommands.keys()).sort();
                const totalCommands = bot.commands.size;
                const premiumCommands = Array.from(bot.commands.values()).filter(cmd => cmd.isPremium).length;
                const userAccessibleCommands = isPremiumUser ? totalCommands : totalCommands - premiumCommands;

                const helpHeader = `
${PremiumStyles.formatHeader("ACEPHAR PREMIUM COMMANDS", "🏆")}
║                                      ║
║ 📊 *Command Statistics:*             ║
║ • Total Commands: ${String(totalCommands).padEnd(17)} ║
║ • Premium Commands: ${String(premiumCommands).padEnd(15)} ║
║ • Your Access: ${String(userAccessibleCommands).padEnd(20)} ║
║                                      ║
║ ${isPremiumUser ? '👑 *Status: PREMIUM USER*' : '🔓 *Status: STANDARD USER*'.padEnd(36)} ║
║                                      ║
║ 📋 *Available Categories:*           ║
                `.trim();

                let categoryList = '';
                categories.forEach((category, index) => {
                    const commandsInCategory = bot.categorizedCommands.get(category);
                    const accessibleInCategory = isPremiumUser ? 
                        commandsInCategory.length : 
                        commandsInCategory.filter(cmd => !cmd.isPremium).length;
                    
                    categoryList += `║ ${(index + 1).toString().padStart(2)}. ${category} (${accessibleInCategory} commands)${' '.repeat(Math.max(0, 28 - category.length - accessibleInCategory.toString().length))} ║\n`;
                });

                const helpFooter = `
║                                      ║
${PremiumStyles.formatFooter()}

${isPremiumUser ? 
    `${PremiumStyles.crown} *Premium User Benefits Active!*\n${PremiumStyles.fire} You have access to ALL ${totalCommands} commands!` :
    `${PremiumStyles.diamond} *Upgrade to Premium for ${premiumCommands} more commands!*\n${PremiumStyles.info} Contact Ernest Tech House for premium access.`
}

📖 *Usage:* \`${commandPrefix}help [command_name]\` for detailed help
🎯 *Quick Start:* Reply with a category number to explore commands
                `.trim();

                const fullHelpMessage = helpHeader + '\n' + categoryList + helpFooter;

                // Store session for interactive browsing
                context.interactiveSessions.set(chatId, {
                    type: 'help',
                    categories: categories,
                    timestamp: Date.now(),
                    allCommands: bot.commands,
                    categorizedCommands: bot.categorizedCommands,
                });

                await sock.sendMessage(chatId, { text: fullHelpMessage }, { quoted: msg });
            }

            await sock.sendPresenceUpdate('paused', chatId);

        } catch (error) {
            await sock.sendPresenceUpdate('paused', chatId);
            logger.error(`${PremiumStyles.error} Error in premium help command:`, error);
            
            const errorMessage = PremiumStyles.formatError(
                "Help System Error",
                "Unable to load command help at this time. Please try again.",
                `${commandPrefix}help`
            );
            
            await sock.sendMessage(chatId, { text: errorMessage }, { quoted: msg });
        }
    }
};

// ===================================================================
// PREMIUM COMMAND WRAPPER UTILITY
// ===================================================================

/**
 * Utility function to wrap any command with premium styling and features
 * @param {Object} command - The original command object
 * @returns {Object} - Enhanced command with premium features
 */
export function enhanceCommandWithPremium(command) {
    const originalExecute = command.execute;
    
    return {
        ...command,
        async execute(sock, msg, args, logger, context) {
            const { PremiumStyles, chatId, isPremiumUser, commandPrefix } = context;
            
            try {
                // Premium typing indicator
                await sock.sendPresenceUpdate('composing', chatId);
                
                // Add premium processing indicator for premium users
                if (isPremiumUser && command.isPremium) {
                    const processingMsg = await sock.sendMessage(chatId, {
                        text: `${PremiumStyles.loading} *ACEPHAR Premium* Processing your request...`
                    }, { quoted: msg });
                    
                    // Small delay for premium feel
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
                
                // Execute original command
                await originalExecute(sock, msg, args, logger, context);
                
                // Clear typing
                await sock.sendPresenceUpdate('paused', chatId);
                
            } catch (error) {
                await sock.sendPresenceUpdate('paused', chatId);
                throw error; // Let the main handler deal with it
            }
        }
    };
}