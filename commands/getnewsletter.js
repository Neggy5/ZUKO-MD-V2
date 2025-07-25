module.exports = async (sock, chatId, msg) => {
    try {
        // Check if the message has newsletter context info
        const newsletterInfo = msg.message?.extendedTextMessage?.contextInfo?.forwardedNewsletterMessageInfo;
        
        if (!newsletterInfo) {
            return sock.sendMessage(chatId, {
                text: '❌ This is not a newsletter message.\n\nPlease reply to a newsletter message to get its JID.',
                ...channelInfo
            });
        }

        const responseText = `📰 *Newsletter Information*\n\n` +
                            `• *Newsletter JID:* ${newsletterInfo.newsletterJid}\n` +
                            `• *Newsletter Name:* ${newsletterInfo.newsletterName}\n` +
                            `• *Server Message ID:* ${newsletterInfo.serverMessageId}\n\n` +
                            `_Use this JID to track newsletter messages_`;

        await sock.sendMessage(chatId, {
            text: responseText,
            ...channelInfo
        });

    } catch (error) {
        console.error('Error in getnewsletter command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to get newsletter information. Please try again with a different message.',
            ...channelInfo
        });
    }
};

// Channel info configuration (same as in main.js)
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363401680775438@newsletter',
            newsletterName: '𝐙𝐔𝐊𝐎-𝐌𝐃',
            serverMessageId: -1
        }
    }
};