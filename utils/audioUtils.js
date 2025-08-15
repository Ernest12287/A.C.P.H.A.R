import { readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Gets a random audio file path from a specified directory.
 * @param {string} directoryPath - The path to the directory containing audio files.
 * @returns {Promise<string|null>} - A promise that resolves to the path of a random audio file, or null if no audio files are found.
 */
export async function getRandomAudioFile(directoryPath) {
    try {
        const files = await readdir(directoryPath);
        const audioFiles = files.filter(file => {
            const lowerCaseFile = file.toLowerCase();
            return lowerCaseFile.endsWith('.mp3') || lowerCaseFile.endsWith('.ogg') || lowerCaseFile.endsWith('.wav');
        });

        if (audioFiles.length === 0) {
            console.warn(`No audio files found in directory: ${directoryPath}`);
            return null;
        }

        const randomIndex = Math.floor(Math.random() * audioFiles.length);
        return join(directoryPath, audioFiles[randomIndex]);
    } catch (error) {
        console.error(`Error reading audio directory ${directoryPath}:`, error);
        return null;
    }
}