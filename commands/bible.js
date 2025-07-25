const axios = require('axios');

module.exports = async (sock, chatId, msg) => {
    try {
        const text = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        
        // Extract book, chapter, verse from command (format: .bible John 3:16)
        const parts = text.split(' ').slice(1).join(' ').split(/[: ]+/);
        
        if (parts.length < 3) {
            return sock.sendMessage(chatId, {
                text: `📖 *Bible Command Usage:*\n.bible <book> <chapter>:<verse>\nExample: .bible John 3:16\n.bible Genesis 1:1-3`,
                ...channelInfo
            });
        }

        const book = parts[0];
        const chapter = parts[1];
        let verseRange = parts[2];
        
        // Handle verse ranges (e.g., 1-3)
        const [verseStart, verseEnd] = verseRange.includes('-') ? 
            verseRange.split('-').map(Number) : 
            [Number(verseRange), Number(verseRange)];
        
        // Fetch from API
        const apiUrl = `https://bible-api.com/${book}+${chapter}:${verseStart}${verseEnd !== verseStart ? `-${verseEnd}` : ''}?translation=kjv`;
        
        const response = await axios.get(apiUrl);
        const data = response.data;
        
        if (!data.verses || data.verses.length === 0) {
            return sock.sendMessage(chatId, {
                text: '❌ Verse not found. Please check the reference and try again.',
                ...channelInfo
            });
        }
        
        // Format the response
        let bibleText = `*${data.reference} (KJV)*\n\n`;
        data.verses.forEach(verse => {
            bibleText += `*${verse.verse}.* ${verse.text}\n`;
        });
        
        bibleText += `\n_${data.translation_name}_`;
        
        await sock.sendMessage(chatId, {
            text: bibleText,
            ...channelInfo
        });

    } catch (error) {
        console.error('Bible command error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to fetch Bible verse. Please try again later.',
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