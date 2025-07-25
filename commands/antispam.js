const fs = require('fs');
const path = require('path');

// Configuration file path
const CONFIG_PATH = path.join(__dirname, '../config/antispam.json');

// Default configuration
const defaultConfig = {
    enabled: true,
    maxMessages: 5,      // Max messages per minute
    maxMentions: 3,      // Max mentions per message
    banDuration: 30,     // Minutes
    exemptAdmins: true,
    exemptGroups: [],    // Group IDs that are exempt
    wordFilter: ["http://", "https://", "www."]
};

// Load or create config
let config = {...defaultConfig};
try {
    config = {...defaultConfig, ...JSON.parse(fs.readFileSync(CONFIG_PATH))};
} catch (error) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
}

// User message counters
const userMessageCounts = new Map();

module.exports = {
    handleAntiSpam: async (sock, message) => {
        if (!config.enabled) return false;

        const chatId = message.key.remoteJid;
        const sender = message.key.participant || chatId;
        const isGroup = chatId.endsWith('@g.us');

        // Check if group is exempt
        if (isGroup && config.exemptGroups.includes(chatId)) {
            return false;
        }

        // Check if user is admin (if exemptAdmins is true)
        if (config.exemptAdmins && isGroup) {
            const metadata = await sock.groupMetadata(chatId);
            const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
            if (isAdmin) return false;
        }

        // Get message content
        const text = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || '';

        // Check for spammy links
        if (config.wordFilter.some(word => text.includes(word))) {
            return true;
        }

        // Check mention spam
        const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentions.length > config.maxMentions) {
            return true;
        }

        // Rate limiting
        const now = Date.now();
        const userCounts = userMessageCounts.get(sender) || { count: 0, lastReset: now };

        // Reset counter if minute has passed
        if (now - userCounts.lastReset > 60000) {
            userCounts.count = 0;
            userCounts.lastReset = now;
        }

        userCounts.count++;
        userMessageCounts.set(sender, userCounts);

        if (userCounts.count > config.maxMessages) {
            return true;
        }

        return false;
    },

    antispamCommand: async (sock, chatId, msg, args) => {
        const isAdmin = true; // Add your admin check logic here
        
        if (!isAdmin && !msg.key.fromMe) {
            return sock.sendMessage(chatId, {
                text: '❌ This command is for admins only!',
                ...channelInfo
            });
        }

        const subcmd = args[0]?.toLowerCase();
        
        switch (subcmd) {
            case 'on':
                config.enabled = true;
                await updateConfig();
                return sock.sendMessage(chatId, {
                    text: '✅ Anti-spam protection enabled',
                    ...channelInfo
                });
                
            case 'off':
                config.enabled = false;
                await updateConfig();
                return sock.sendMessage(chatId, {
                    text: '⚠️ Anti-spam protection disabled',
                    ...channelInfo
                });
                
            case 'status':
                return sock.sendMessage(chatId, {
                    text: `🛡️ *Anti-Spam Status*\n\n` +
                          `• Enabled: ${config.enabled ? '✅' : '❌'}\n` +
                          `• Max messages/min: ${config.maxMessages}\n` +
                          `• Max mentions: ${config.maxMentions}\n` +
                          `• Ban duration: ${config.banDuration} mins\n` +
                          `• Admin exempt: ${config.exemptAdmins ? '✅' : '❌'}\n` +
                          `• Exempt groups: ${config.exemptGroups.length}`,
                    ...channelInfo
                });
                
            case 'exempt':
                if (!chatId.endsWith('@g.us')) {
                    return sock.sendMessage(chatId, {
                        text: '❌ This subcommand only works in groups!',
                        ...channelInfo
                    });
                }
                
                const action = args[1]?.toLowerCase();
                if (action === 'add') {
                    if (!config.exemptGroups.includes(chatId)) {
                        config.exemptGroups.push(chatId);
                        await updateConfig();
                    }
                    return sock.sendMessage(chatId, {
                        text: '✅ Current group added to exempt list',
                        ...channelInfo
                    });
                } else if (action === 'remove') {
                    config.exemptGroups = config.exemptGroups.filter(g => g !== chatId);
                    await updateConfig();
                    return sock.sendMessage(chatId, {
                        text: '✅ Current group removed from exempt list',
                        ...channelInfo
                    });
                }
                break;
                
            default:
                return sock.sendMessage(chatId, {
                    text: `🛡️ *Anti-Spam Commands*\n\n` +
                          `.antispam on/off - Enable/disable\n` +
                          `.antispam status - Show settings\n` +
                          `.antispam exempt add/remove - Group exemption\n` +
                          `\nCurrent status: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                    ...channelInfo
                });
        }
    }
};

async function updateConfig() {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

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