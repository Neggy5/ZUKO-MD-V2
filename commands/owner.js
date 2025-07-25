const settings = require('../settings');

async function ownerCommand(sock, chatId, message) {
    try {
        // Create vcard with owner information
        const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${settings.botOwner || "Bot Owner"}
TEL;type=CELL;waid=${settings.ownerNumber}:${settings.ownerNumber}
END:VCARD
`.trim();

        // Send contact card with owner details
        await sock.sendMessage(chatId, {
            contacts: {
                displayName: settings.botOwner || "My Owner",
                contacts: [{ vcard }]
            },
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

        // Optional: Send additional info message
        await sock.sendMessage(chatId, {
            text: `👑 *Owner Contact*\n\n` +
                  `Name: ${settings.botOwner || "Not specified"}\n` +
                  `Number: ${settings.ownerNumber || "Not specified"}\n\n` +
                  `Contact the owner for any questions about ${settings.botName || "the bot"}.`,
            quoted: message
        });

    } catch (error) {
        console.error('Error in owner command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to retrieve owner information',
            quoted: message
        });
    }
}

module.exports = ownerCommand;