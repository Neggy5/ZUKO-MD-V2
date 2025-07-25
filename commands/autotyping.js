let isTypingActive = false;
let typingInterval = null;

module.exports = async (sock, chatId, msg) => {
    try {
        // Toggle state
        isTypingActive = !isTypingActive;
        
        if (isTypingActive) {
            // Start typing
            await sock.sendPresenceUpdate('composing', chatId);
            
            // Keep alive by sending presence every 5 seconds
            typingInterval = setInterval(() => {
                sock.sendPresenceUpdate('composing', chatId);
            }, 5000);
            
            await sock.sendMessage(chatId, {
                text: '✍️ Auto-typing is now ON',
                ...channelInfo
            });
        } else {
            // Stop typing
            clearInterval(typingInterval);
            await sock.sendPresenceUpdate('paused', chatId);
            
            await sock.sendMessage(chatId, {
                text: '✅ Auto-typing is now OFF',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('Error in autotyping command:', error);
        clearInterval(typingInterval);
        await sock.sendPresenceUpdate('paused', chatId);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to toggle auto-typing',
            ...channelInfo
        });
    }
};

// Channel info configuration
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