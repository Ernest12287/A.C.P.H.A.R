// src/utils/timeUtils.js

/**
 * Formats a duration in seconds into a human-readable string (e.g., "1d 2h 3m 4s").
 * @param {number} seconds The duration in seconds.
 * @returns {string} The formatted duration string.
 */
export function formatDuration(seconds) {
    const units = [
        { name: 'd', seconds: 24 * 60 * 60 },
        { name: 'h', seconds: 60 * 60 },
        { name: 'm', seconds: 60 },
        { name: 's', seconds: 1 }
    ];

    let result = [];
    let remainingSeconds = seconds;

    for (const unit of units) {
        const value = Math.floor(remainingSeconds / unit.seconds);
        if (value > 0) {
            result.push(`${value}${unit.name}`);
            remainingSeconds %= unit.seconds;
        }
    }

    return result.length > 0 ? result.join(' ') : '0s';
}