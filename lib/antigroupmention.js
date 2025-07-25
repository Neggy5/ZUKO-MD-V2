// lib/antigroupmention.js
const fs = require('fs');
const path = require('path');

async function checkGroupMentions(sock, message) {
    try {
        const chatId = message.key.remoteJid;
        if (!chatId.endsWith('@g.us')) return false;

        const dataPath = path.join(__dirname, '../data/antigroupmention.json');
        let data = {};
        
        try {
            data = JSON.parse(fs.readFileSync(dataPath));
        } catch (e) {
            return false; // No settings exist
        }

        const groupSettings = data[chatId];
        if (!groupSettings || !groupSettings.enabled) return false;

        const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentions.length <= groupSettings.maxMentions) return false;

        // Take action if mentions exceed limit
        const sender = message.key.participant || message.key.remoteJid;
        
        if (groupSettings.action === "warn") {
            await sock.sendMessage(chatId, {
                text: `⚠️ @${sender.split('@')[0]} - Please don't mention more than ${groupSettings.maxMentions} people at once!`,
                mentions: [sender],
                ...channelInfo
            });
        } else if (groupSettings.action === "kick") {
            await sock.groupParticipantsUpdate(chatId, [sender], "remove");
            await sock.sendMessage(chatId, {
                text: `🚫 @${sender.split('@')[0]} was kicked for mentioning too many people!`,
                mentions: [sender],
                ...channelInfo
            });
        }

        return true;
    } catch (error) {
        console.error("Error in checkGroupMentions:", error);
        return false;
    }
}

module.exports = {
    checkGroupMentions
};