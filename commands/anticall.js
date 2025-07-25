const fs = require('fs');
const path = require('path');

// Configuration file path
const CONFIG_PATH = path.join(__dirname, '../config/anticall.json');

// Default configuration
const defaultConfig = {
    enabled: true,
    blockVoiceCalls: true,
    blockVideoCalls: true,
    notifyAdmin: true,
    allowedCallers: [],  // JIDs that can always call
    autoBlockDuration: 60  // Minutes
};

// Load or create config
let config = {...defaultConfig};
try {
    config = {...defaultConfig, ...JSON.parse(fs.readFileSync(CONFIG_PATH))};
} catch (error) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
}

// Track blocked users
const blockedCallers = new Map();

module.exports = {
    handleIncomingCall: async (sock, call) => {
        if (!config.enabled) return false;

        const callerJid = call.from;
        const callType = call.isVideo ? 'video' : 'voice';

        // Check if caller is allowed
        if (config.allowedCallers.includes(callerJid)) {
            return false;
        }

        // Check if this call type should be blocked
        if ((callType === 'voice' && !config.blockVoiceCalls) || 
            (callType === 'video' && !config.blockVideoCalls)) {
            return false;
        }

        // Block the call
        await sock.rejectCall(call.id, call.from);

        // Notify admin if enabled
        if (config.notifyAdmin) {
            const adminJid = 'YOUR_ADMIN_JID_HERE'; // Replace with admin JID
            await sock.sendMessage(adminJid, {
                text: `🚫 Blocked ${callType} call from: ${callerJid}`,
                ...channelInfo
            });
        }

        // Temporarily block future calls
        blockedCallers.set(callerJid, Date.now());
        
        return true;
    },

    anticallCommand: async (sock, chatId, msg, args) => {
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
                    text: '✅ Anti-call protection enabled',
                    ...channelInfo
                });
                
            case 'off':
                config.enabled = false;
                await updateConfig();
                return sock.sendMessage(chatId, {
                    text: '⚠️ Anti-call protection disabled',
                    ...channelInfo
                });
                
            case 'voice':
                config.blockVoiceCalls = args[1]?.toLowerCase() !== 'off';
                await updateConfig();
                return sock.sendMessage(chatId, {
                    text: `✅ Voice calls ${config.blockVoiceCalls ? 'blocked' : 'allowed'}`,
                    ...channelInfo
                });
                
            case 'video':
                config.blockVideoCalls = args[1]?.toLowerCase() !== 'off';
                await updateConfig();
                return sock.sendMessage(chatId, {
                    text: `✅ Video calls ${config.blockVideoCalls ? 'blocked' : 'allowed'}`,
                    ...channelInfo
                });
                
            case 'allow':
                const jidToAllow = args[1];
                if (!jidToAllow) {
                    return sock.sendMessage(chatId, {
                        text: '⚠️ Please provide a JID\nExample: .anticall allow 1234567890@s.whatsapp.net',
                        ...channelInfo
                    });
                }
                
                if (!config.allowedCallers.includes(jidToAllow)) {
                    config.allowedCallers.push(jidToAllow);
                    await updateConfig();
                }
                return sock.sendMessage(chatId, {
                    text: `✅ ${jidToAllow} added to allowed callers`,
                    ...channelInfo
                });
                
            case 'block':
                const jidToBlock = args[1];
                if (!jidToBlock) {
                    return sock.sendMessage(chatId, {
                        text: '⚠️ Please provide a JID\nExample: .anticall block 1234567890@s.whatsapp.net',
                        ...channelInfo
                    });
                }
                
                config.allowedCallers = config.allowedCallers.filter(j => j !== jidToBlock);
                await updateConfig();
                return sock.sendMessage(chatId, {
                    text: `✅ ${jidToBlock} removed from allowed callers`,
                    ...channelInfo
                });
                
            case 'status':
                return sock.sendMessage(chatId, {
                    text: `📞 *Anti-Call Status*\n\n` +
                          `• Enabled: ${config.enabled ? '✅' : '❌'}\n` +
                          `• Block voice calls: ${config.blockVoiceCalls ? '✅' : '❌'}\n` +
                          `• Block video calls: ${config.blockVideoCalls ? '✅' : '❌'}\n` +
                          `• Notify admin: ${config.notifyAdmin ? '✅' : '❌'}\n` +
                          `• Allowed callers: ${config.allowedCallers.length}\n` +
                          `• Auto-block duration: ${config.autoBlockDuration} mins`,
                    ...channelInfo
                });
                
            default:
                return sock.sendMessage(chatId, {
                    text: `📞 *Anti-Call Commands*\n\n` +
                          `.anticall on/off - Enable/disable\n` +
                          `.anticall voice on/off - Voice call control\n` +
                          `.anticall video on/off - Video call control\n` +
                          `.anticall allow <jid> - Allow caller\n` +
                          `.anticall block <jid> - Block caller\n` +
                          `.anticall status - Show settings\n` +
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