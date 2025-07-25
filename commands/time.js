const { format } = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz');

// Timezone database with emoji flags
const timezones = {
    'WIB': { zone: 'Asia/Jakarta', flag: '🇮🇩', name: 'Western Indonesia' },      // GMT+7
    'WITA': { zone: 'Asia/Makassar', flag: '🇮🇩', name: 'Central Indonesia' },   // GMT+8
    'WIT': { zone: 'Asia/Jayapura', flag: '🇮🇩', name: 'Eastern Indonesia' },    // GMT+9
    'UTC': { zone: 'UTC', flag: '🌐', name: 'Coordinated Universal' },           // GMT+0
    'NYC': { zone: 'America/New_York', flag: '🇺🇸', name: 'New York' },         // GMT-4/-5
    'LON': { zone: 'Europe/London', flag: '🇬🇧', name: 'London' },              // GMT+0/+1
    'TOK': { zone: 'Asia/Tokyo', flag: '🇯🇵', name: 'Tokyo' },                  // GMT+9
    'LAG': { zone: 'Africa/Lagos', flag: '🇳🇬', name: 'Lagos' },               // GMT+1
    'SERVER': { zone: Intl.DateTimeFormat().resolvedOptions().timeZone, flag: '⚙️', name: 'Server' }
};

module.exports = async (sock, chatId, message, args) => {
    try {
        // Get requested timezone or default to server
        const tzCode = args[0]?.toUpperCase() || 'SERVER';
        const tzData = timezones[tzCode] || timezones.SERVER;
        
        // Get current time in specified zone
        const now = new Date();
        const zonedTime = utcToZonedTime(now, tzData.zone);
        
        // Format the output
        const timeMessage = `
${tzData.flag} *${tzData.name} Time (${tzCode})* ${tzData.flag}

🕰️ *Time:* ${format(zonedTime, 'hh:mm:ss a')}
📅 *Date:* ${format(zonedTime, 'eeee, MMMM do yyyy')}
📍 *Zone:* ${tzData.zone.replace(/_/g, ' ')}

*Available Zones:*
${Object.keys(timezones).filter(k => k !== 'SERVER').join(', ')}
`.trim();

        await sock.sendMessage(chatId, { 
            text: timeMessage,
            quoted: message,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363401680775438@newsletter',
                    newsletterName: '𝐙𝐔𝐊𝐎-𝐌𝐃',
                    serverMessageId: -1
                }
            }
        });
        
    } catch (error) {
        console.error('Time command error:', error);
        await sock.sendMessage(chatId, {
            text: '⚠️ Failed to get time. Use *.time [zone]*\nAvailable: ' + 
                  Object.keys(timezones).filter(k => k !== 'SERVER').join(', '),
            quoted: message
        });
    }
};