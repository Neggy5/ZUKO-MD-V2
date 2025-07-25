const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = async (sock, chatId, msg) => {
    try {
        // Check if message is a reply
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        let targetJid;
        
        // Priority: 1. Quoted message 2. Mentioned user 3. Message sender
        if (quotedMsg) {
            targetJid = quotedMsg.key?.participant || quotedMsg.key?.remoteJid;
        } else if (mentionedJid.length > 0) {
            targetJid = mentionedJid[0];
        } else {
            targetJid = msg.key.participant || msg.key.remoteJid;
        }

        if (!targetJid) {
            return sock.sendMessage(chatId, { 
                text: 'Please reply to a message or mention a user to get their profile picture',
                ...channelInfo
            });
        }

        // Get profile picture URL
        const profilePictureUrl = await sock.profilePictureUrl(targetJid, 'image');
        
        if (!profilePictureUrl) {
            return sock.sendMessage(chatId, { 
                text: 'No profile picture found for this user',
                ...channelInfo
            });
        }

        // Download the image
        const response = await axios.get(profilePictureUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data, 'binary');
        
        // Send the image
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: `Profile picture of @${targetJid.split('@')[0]}`,
            mentions: [targetJid],
            ...channelInfo
        });

    } catch (error) {
        console.error('Error in getpp command:', error);
        if (error.message.includes('404')) {
            await sock.sendMessage(chatId, { 
                text: 'No profile picture found for this user',
                ...channelInfo
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: 'Failed to get profile picture. Please try again later.',
                ...channelInfo
            });
        }
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