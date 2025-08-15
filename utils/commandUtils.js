// src/utils/commandUtils.js

/**
 * Gets the command prefix from the environment variables.
 * @returns {string} The command prefix. Defaults to '!' if not set.
 */
export function getPrefix() {
    return process.env.COMMAND_PREFIX || '!';
}
