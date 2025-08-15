// src/commands/schedule.js

import { startScheduler } from '../handlers/scheduler.js';

// A simple in-memory cache for the scheduler instance.
let scheduler;

export default {
    name: "schedule",
    alias: ["cron"],
    desc: "Manages scheduled tasks. Use `add`, `list`, or `delete`.",
    category: "General",
    usage: "add <cron_string> <message> | list | delete <task_id>",
    react: "🗓️",

    /**
     * @param {import('baileys-x').WASocket} sock
     * @param {import('baileys-x').proto.IWebMessageInfo} msg
     * @param {string[]} args
     * @param {object} context
     */
    async execute(sock, msg, args, context) {
        const { chatId, senderJid, logger, ownerJid } = context;

        // Ensure the scheduler is initialized once.
        if (!scheduler) {
            logger.info("Initializing scheduler for the first time...");
            scheduler = await startScheduler(sock, ownerJid);
            // After initialization, load all tasks.
            await scheduler.loadTasks();
        }

        if (!scheduler) {
            await sock.sendMessage(chatId, { text: "Error: The scheduler could not be initialized." }, { quoted: msg });
            return;
        }

        const action = args[0]?.toLowerCase();
        
        // Ensure the command is only executed by the owner.
        if (senderJid !== ownerJid) {
            await sock.sendMessage(chatId, { text: "This command is for the bot owner only." }, { quoted: msg });
            return;
        }

        if (action === "add") {
            const cronString = args[1];
            const message = args.slice(2).join(" ");
            
            if (!cronString || !message) {
                await sock.sendMessage(chatId, { text: `Usage: ${context.prefix}schedule add <cron_string> <message>` }, { quoted: msg });
                return;
            }

            try {
                // Add the task and get its ID.
                const taskId = await scheduler.addTask(sock, ownerJid, cronString, message);
                await sock.sendMessage(chatId, { text: `✅ Task scheduled successfully! ID: \`${taskId}\`` }, { quoted: msg });
            } catch (error) {
                logger.error("Error adding schedule:", error);
                await sock.sendMessage(chatId, { text: "Failed to add the schedule. Please check the cron string." }, { quoted: msg });
            }
        } else if (action === "list") {
            const tasks = await scheduler.getTasks();

            if (tasks.length === 0) {
                await sock.sendMessage(chatId, { text: "There are no scheduled tasks." }, { quoted: msg });
                return;
            }

            const taskList = tasks.map(task => 
                `*ID:* \`${task.id}\`\n*Cron:* \`${task.cron}\`\n*Message:* ${task.message}\n`
            ).join('\n---\n');

            await sock.sendMessage(chatId, { text: `📋 *Scheduled Tasks:*\n\n${taskList}` }, { quoted: msg });
        } else if (action === "delete") {
            const taskId = args[1];
            
            if (!taskId) {
                await sock.sendMessage(chatId, { text: `Usage: ${context.prefix}schedule delete <task_id>` }, { quoted: msg });
                return;
            }

            const deleted = await scheduler.deleteTask(taskId);
            if (deleted) {
                await sock.sendMessage(chatId, { text: `✅ Task with ID \`${taskId}\` deleted successfully.` }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { text: `❌ Failed to delete task with ID \`${taskId}\`. It may not exist.` }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(chatId, { text: `Unknown action. Use \`add\`, \`list\`, or \`delete\`.` }, { quoted: msg });
        }
    },
};
