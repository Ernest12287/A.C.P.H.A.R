// src/commands/utility/weather.js

export default {
    name: 'weather',
    aliases: ['w', 'temp'],
    description: 'Gets current weather for a city. Usage: !weather <city_name>',
    isPremium: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    category: 'Utility',

    /**
     * Executes the weather command.
     * @param {object} sock - The Baileys socket instance.
     * @param {object} message - The message object.
     * @param {string[]} args - Arguments passed with the command (city name).
     * @param {object} logger - The logger instance.
     * @param {object} context - Additional context.
     */
    async execute(sock, message, args, logger, context) {
        const chatId = message.key.remoteJid;
        const city = args.join(' ').trim();
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            return await sock.sendMessage(chatId, { text: '❌ *Configuration Error*\n\nOpenWeatherMap API key is not set in .env. Cannot fetch weather.' }, { quoted: message });
        }

        if (!city) {
            return await sock.sendMessage(chatId, { text: `❌ *Usage Error*\n\nPlease provide a city name. Example: \`${context.commandPrefix}weather Nairobi\`` }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, { text: `🔎 Fetching weather for *${city}*...` }, { quoted: message });

            const weatherUrl = `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
            const response = await fetch(weatherUrl);
            const data = await response.json();

            if (response.ok) {
                if (data.cod === 200) { // Check for successful API response code
                    const weather = data.weather[0];
                    const main = data.main;
                    const wind = data.wind;
                    const sys = data.sys;

                    const weatherMessage = `
🌍 *Weather in ${data.name}, ${sys.country}* 🌍

*Condition:* ${weather.description.charAt(0).toUpperCase() + weather.description.slice(1)}
*Temperature:* ${main.temp}°C (Feels like ${main.feels_like}°C)
*Min/Max Temp:* ${main.temp_min}°C / ${main.temp_max}°C
*Humidity:* ${main.humidity}%
*Wind Speed:* ${wind.speed} m/s
*Pressure:* ${main.pressure} hPa

_Sunrise: ${new Date(sys.sunrise * 1000).toLocaleTimeString()} | Sunset: ${new Date(sys.sunset * 1000).toLocaleTimeString()}_
                    `.trim();
                    await sock.sendMessage(chatId, { text: weatherMessage }, { quoted: message });
                    logger.info(`Weather info sent for ${city} to ${chatId}.`);
                } else {
                    await sock.sendMessage(chatId, { text: `❌ *Weather Error*\n\nCould not find weather for *${city}*. Please check the city name.` }, { quoted: message });
                    logger.warn(`Weather API returned error for ${city}: ${data.message || data.cod}`);
                }
            } else {
                await sock.sendMessage(chatId, { text: `❌ *API Error*\n\nFailed to connect to weather service. Status: ${response.status}` }, { quoted: message });
                logger.error(`OpenWeatherMap API call failed for ${city}: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            logger.error(`Error in weather command for ${city}:`, error);
            await sock.sendMessage(chatId, { text: '❌ *System Error*\n\nAn unexpected error occurred while fetching weather data.' }, { quoted: message });
        }
    },
};