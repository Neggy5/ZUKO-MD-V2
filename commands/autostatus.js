const fs = require('fs');
const path = require('path');

class AutoStatusManager {
    constructor() {
        this.configPath = path.join(__dirname, '../data/autoStatus.json');
        this.config = { enabled: false };
        this.cooldown = new Map();
        this.initializeConfig();
    }

    initializeConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                this.config = JSON.parse(fs.readFileSync(this.configPath));
            } else {
                this.saveConfig();
            }
        } catch (error) {
            console.error('Error initializing auto-status config:', error);
            this.saveConfig(); // Recreate config file if corrupted
        }
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Error saving auto-status config:', error);
        }
    }

    toggleEnabled() {
        this.config.enabled = !this.config.enabled;
        this.saveConfig();
        return this.config.enabled;
    }

    isEnabled() {
        return this.config.enabled;
    }

    shouldProcessStatus(senderId) {
        // Check cooldown (5 seconds per user)
        if (this.cooldown.has(senderId)) {
            const lastViewed = this.cooldown.get(senderId);
            if (Date.now() - lastViewed < 5000) return false;
        }
        this.cooldown.set(senderId, Date.now());
        return true;
    }
}

const statusManager = new AutoStatusManager();

class StatusFormatter {
    static getStatus(manager) {
        return `🔄 *Auto Status Viewer*\n\nCurrent status: ${manager.isEnabled() ? 'ENABLED ✅' : 'DISABLED ❌'}`;
    }

    static getHelp(prefix = '.') {
        return [
            '📌 *Auto Status Commands*',
            `\`${prefix}autostatus on\` - Enable automatic status viewing`,
            `\`${prefix}autostatus off\` - Disable automatic status viewing`,
            `\`${prefix}autostatus status\` - Show current settings`
        ].join('\n');
    }
}

async function handleAutoStatusCommand(sock, chatId, msg, args) {
    try {
        // Verify owner privilege
        if (!msg.key.fromMe) {
            return await sock.sendMessage(chatId, { 
                text: '❌ This command is restricted to the owner only!',
                ...channelInfo
            });
        }

        // Show status if no arguments
        if (!args || args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `${StatusFormatter.getStatus(statusManager)}\n\n${StatusFormatter.getHelp()}`,
                ...channelInfo
            });
        }

        const command = args[0].toLowerCase();

        switch (command) {
            case 'on':
            case 'off':
                const newState = statusManager.toggleEnabled();
                await sock.sendMessage(chatId, {
                    text: `✅ Auto status viewer ${newState ? 'enabled' : 'disabled'}`,
                    ...channelInfo
                });
                break;

            case 'status':
                await sock.sendMessage(chatId, {
                    text: StatusFormatter.getStatus(statusManager),
                    ...channelInfo
                });
                break;

            default:
                await sock.sendMessage(chatId, {
                    text: `❌ Invalid command!\n\n${StatusFormatter.getHelp()}`,
                    ...channelInfo
                });
        }
    } catch (error) {
        console.error('Auto-status command error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error processing auto-status command\n' + error.message,
            ...channelInfo
        });
    }
}

async function handleStatusUpdates(sock, statusUpdate) {
    try {
        // Skip if feature disabled
        if (!statusManager.isEnabled()) return;

        // Process different types of status updates
        if (statusUpdate.messages) {
            await processStatusMessages(sock, statusUpdate.messages);
        } else if (statusUpdate.reaction) {
            await processStatusReaction(sock, statusUpdate.reaction);
        } else if (statusUpdate.key) {
            await processStatusKey(sock, statusUpdate.key);
        }
    } catch (error) {
        console.error('Status update handler error:', error);
    }
}

async function processStatusMessages(sock, messages) {
    for (const msg of messages) {
        if (msg.key?.remoteJid === 'status@broadcast') {
            await viewStatusWithRetry(sock, msg.key);
        }
    }
}

async function processStatusReaction(sock, reaction) {
    if (reaction.key?.remoteJid === 'status@broadcast') {
        await viewStatusWithRetry(sock, reaction.key);
    }
}

async function processStatusKey(sock, key) {
    if (key.remoteJid === 'status@broadcast') {
        await viewStatusWithRetry(sock, key);
    }
}

async function viewStatusWithRetry(sock, statusKey, retries = 3) {
    try {
        const senderId = statusKey.participant || statusKey.remoteJid;
        
        // Skip if recently processed
        if (!statusManager.shouldProcessStatus(senderId)) return;

        // Add random delay (1-3s) to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        await sock.readMessages([statusKey]);
        console.log(`✅ Viewed status from: ${senderId.split('@')[0]}`);
    } catch (error) {
        if (retries > 0 && error.message?.includes('rate-overlimit')) {
            const delay = (4 - retries) * 2000; // Exponential backoff
            console.log(`⚠️ Rate limited, retrying in ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            await viewStatusWithRetry(sock, statusKey, retries - 1);
        } else {
            console.error('Failed to view status:', error.message);
        }
    }
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

module.exports = {
    command: handleAutoStatusCommand,
    handler: handleStatusUpdates,
    manager: statusManager,
    formatter: StatusFormatter
};