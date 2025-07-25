const os = require('os');
const settings = require('../settings.js');

async function pingCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        const pingMsg = await sock.sendMessage(chatId, { text: '🏓 Pong!' });
        const end = Date.now();
        const ping = end - start;

        // Simple uptime format (days:hours:minutes:seconds)
        const uptime = process.uptime();
        const formattedUptime = new Date(uptime * 1000).toISOString().substr(11, 8);

        const botInfo = `
⚡ *ZUKO-MD Status* ⚡
━━━━━━━━━━━━━━━━
• Ping: ${ping}ms
• Uptime: ${formattedUptime}
• Version: v${settings.version || '2.0.0'}
• Memory: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB
━━━━━━━━━━━━━━━━
`.trim();

        await sock.sendMessage(chatId, { 
            text: botInfo,
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

        // Delete initial ping message
        if (pingMsg?.key?.id) {
            await sock.sendMessage(chatId, {
                delete: {
                    id: pingMsg.key.id,
                    remoteJid: chatId,
                    fromMe: true
                }
            });
        }

    } catch (error) {
        console.error('Error in ping command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to check bot status',
            quoted: message
        });
    }
}

module.exports = pingCommand;