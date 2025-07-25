const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async (sock, chatId, msg) => {
    try {
        // Check if in a group
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: '❌ This command only works in groups!',
                ...channelInfo
            });
        }

        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        // Check if bot is admin
        const isAdmin = participants.find(p => p.id === sock.user.id)?.admin;
        if (!isAdmin) {
            return sock.sendMessage(chatId, {
                text: '⚠️ Bot needs to be admin to check online status!',
                ...channelInfo
            });
        }

        // Send initial message
        const processingMsg = await sock.sendMessage(chatId, {
            text: '🔄 Checking online users... This may take a moment.',
            ...channelInfo
        });

        // Array to store online users
        const onlineUsers = [];

        // Check presence for each participant
        for (const participant of participants) {
            try {
                // Skip bot itself
                if (participant.id === sock.user.id) continue;

                // Get presence
                const presence = await sock.presenceSubscribe(chatId);
                const userPresence = await sock.onPresenceUpdate(chatId, participant.id);
                
                // If user is online
                if (userPresence.lastKnownPresence === 'available') {
                    onlineUsers.push(participant.id);
                }

                // Avoid rate limiting
                await delay(1000);
            } catch (error) {
                console.error(`Error checking ${participant.id}:`, error);
            }
        }

        // Format response
        let responseText = `👥 *Online Users* (${onlineUsers.length}/${participants.length-1})\n\n`;
        
        if (onlineUsers.length > 0) {
            onlineUsers.forEach((user, index) => {
                const username = user.split('@')[0];
                responseText += `${index+1}. @${username}\n`;
            });
        } else {
            responseText += 'No users currently online';
        }

        // Delete processing message and send result
        await sock.sendMessage(chatId, {
            delete: processingMsg.key
        });

        await sock.sendMessage(chatId, {
            text: responseText,
            mentions: onlineUsers,
            ...channelInfo
        });

    } catch (error) {
        console.error('Error in listonline command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to check online users. Please try again later.',
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