// src/commands/owner/obfuscate-build.js

import JavaScriptObfuscator from 'javascript-obfuscator';
import { promises as fs } from 'fs';
import { join } from 'path';

// This command is a build script that creates a deployable, obfuscated version of the bot.
// It is triggered by a command like `!obfuscate-build`.
export default {
    name: 'obfuscate-build',
    aliases: ['obfbuild', 'deploy'],
    description: 'Creates a fully obfuscated deployment version of the bot in a new "dist" folder.',
    ownerOnly: true,
    category: 'user',
    
    /**
     * Executes the obfuscation build command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Command arguments.
     * @param {object} logger - The logger instance.
     */
    async execute(sock, message, args, logger) {
        const from = message.key.remoteJid;
        const msg = message;
        
        await sock.sendMessage(from, { text: '🔄 Starting the comprehensive obfuscation and build process. Please wait...' }, { quoted: msg });

        const sourceDir = join(process.cwd(), 'src');
        const targetDeployDir = join(process.cwd(), 'dist');

        /**
         * Obfuscates a single JavaScript file.
         * @param {string} filePath - The path to the source file.
         * @param {string} outputPath - The path to save the obfuscated file.
         */
        const obfuscateFile = async (filePath, outputPath) => {
            try {
                const code = await fs.readFile(filePath, 'utf8');
                const obfuscationResult = JavaScriptObfuscator.obfuscate(
                    code,
                    {
                        // Core Obfuscation settings from your example
                        compact: true,
                        identifierNamesGenerator: 'hexadecimal',
                        simplify: true,
                        transformObjectKeys: true,

                        // Control Flow Obfuscation
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 1,

                        // String Obfuscation
                        stringArray: true,
                        stringArrayEncoding: ['base64', 'rc4'],
                        stringArrayThreshold: 1,
                        rotateStringArray: true,
                        stringArrayWrappersCount: 10,
                        stringArrayWrappersType: 'function',
                        splitStrings: true,
                        splitStringsChunkLength: 5,

                        // Number Obfuscation
                        numbersToExpressions: true,

                        // Dead Code Injection
                        deadCodeInjection: true,
                        deadCodeInjectionThreshold: 1,

                        // Self-Defending and Anti-Debugging
                        selfDefending: true,
                        debugProtection: true,
                        debugProtectionInterval: 4000,
                        
                        // Other settings
                        renameProperties: true,
                        renamePropertiesMode: 'safe',
                        disableConsoleOutput: false,
                        sourceMap: false,
                        unicodeEscapeSequence: true,
                    }
                );

                const obfuscatedCode = obfuscationResult.getObfuscatedCode();
                await fs.writeFile(outputPath, obfuscatedCode);
                logger.info(`✅ Obfuscated: ${filePath.replace(sourceDir, '')}`);
            } catch (error) {
                logger.error(`❌ Failed to obfuscate ${filePath.replace(sourceDir, '')}:`, error);
                throw error;
            }
        };

        /**
         * Recursively copies and obfuscates a directory.
         * @param {string} src - Source directory.
         * @param {string} dest - Destination directory.
         */
        const copyAndObfuscateDirectory = async (src, dest) => {
            await fs.mkdir(dest, { recursive: true });
            const entries = await fs.readdir(src, { withFileTypes: true });

            for (const entry of entries) {
                const srcPath = join(src, entry.name);
                const destPath = join(dest, entry.name);

                if (entry.isDirectory()) {
                    // Skip specific directories
                    if (entry.name === 'node_modules' || entry.name === 'scripts' || entry.name === 'tests' || entry.name === 'session' || entry.name === 'dist') {
                         logger.info(`⏭️ Skipping directory: ${srcPath.replace(process.cwd(), '')}`);
                         continue;
                    }
                    // For the special case of 'data' folder, we skip 'auth_state'
                    if (entry.name === 'data') {
                        await fs.mkdir(destPath, { recursive: true });
                        const dataEntries = await fs.readdir(srcPath, { withFileTypes: true });
                        for (const dataEntry of dataEntries) {
                             const dataSrcPath = join(srcPath, dataEntry.name);
                             const dataDestPath = join(destPath, dataEntry.name);
                             if (dataEntry.name === 'auth_state') {
                                 logger.info(`⏭️ Skipping directory: ${dataSrcPath.replace(process.cwd(), '')}`);
                                 continue;
                             }
                             // Copy all other files and directories within 'data'
                             if (dataEntry.isFile()) {
                                 await fs.copyFile(dataSrcPath, dataDestPath);
                                 logger.info(`➡️ Copied file: ${dataSrcPath.replace(process.cwd(), '')}`);
                             } else if (dataEntry.isDirectory()) {
                                 await copyAndObfuscateDirectory(dataSrcPath, dataDestPath);
                             }
                        }
                    } else {
                        // Recurse into other directories
                        await copyAndObfuscateDirectory(srcPath, destPath);
                    }
                } else if (entry.isFile()) {
                    if (entry.name.endsWith('.js')) {
                        await obfuscateFile(srcPath, destPath);
                    } else if (entry.name === '.env') {
                        logger.info(`⚠️ Skipped .env file. Remember to configure environment variables in the deployment folder.`);
                    } else {
                        // Copy all other files, including package.json
                        await fs.copyFile(srcPath, destPath);
                        logger.info(`➡️ Copied other file: ${srcPath.replace(process.cwd(), '')}`);
                    }
                }
            }
        };

        try {
            await fs.rm(targetDeployDir, { recursive: true, force: true });
            logger.info(`🧹 Cleaned previous deployment directory: ${targetDeployDir}`);

            await copyAndObfuscateDirectory(process.cwd(), targetDeployDir);
            
            await sock.sendMessage(from, { text: `\n🎉 Obfuscation and copying complete! Your deployable bot is in the "${targetDeployDir}" directory.` }, { quoted: msg });
            
        } catch (error) {
            logger.error(`💥 Obfuscation process failed:`, error);
            await sock.sendMessage(from, { text: `🚫 An error occurred during the obfuscation process: ${error.message}` }, { quoted: msg });
        }
    }
};
