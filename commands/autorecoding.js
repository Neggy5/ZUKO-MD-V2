let isRecordingActive = false;
let recordingInterval = null;

module.exports = async (sock, chatId, msg) => {
    try {
        // Toggle state
        isRecordingActive = !isRecordingActive;
        
        if (isRecordingActive) {
            // Start recording indicator
            await sock.sendPresenceUpdate('recording', chatId);
            
            // Keep alive by sending presence every 5 seconds
            recordingInterval = setInterval(() => {
                sock.sendPresenceUpdate('recording', chatId);
            }, 5000);
            
            await sock.sendMessage(chatId, {
                text: '🎤 Auto-recording is now ON (shows microphone icon)',
                ...channelInfo
            });
        } else {
            // Stop recording indicator
            clearInterval(recordingInterval);
            await sock.sendPresenceUpdate('paused', chatId);
            
            await sock.sendMessage(chatId, {
                text: '✅ Auto-recording is now OFF',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('Error in autorecording command:', error);
        clearInterval(recordingInterval);
        await sock.sendPresenceUpdate('paused', chatId);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to toggle auto-recording',
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