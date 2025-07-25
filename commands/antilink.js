const { getAntilink, setAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

// Constants for consistent behavior
const ACTIONS = ['delete', 'kick', 'warn'];
const LINK_TYPES = {
    whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/,
    whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/,
    telegram: /t\.me\/[A-Za-z0-9_]+/,
    allLinks: /https?:\/\/[^\s]+/,
};

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin) {
    try {
        // Validate admin privileges
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(prefix.length + 'antilink'.length).trim().split(/\s+/);
        const action = args[0]?.toLowerCase();

        // Show usage if no action provided
        if (!action) {
            const usage = [
                '```ANTILINK SETUP```',
                `\`${prefix}antilink on\` - Enable antilink protection`,
                `\`${prefix}antilink set <action>\` - Set action (delete/kick/warn)`,
                `\`${prefix}antilink off\` - Disable antilink`,
                `\`${prefix}antilink get\` - Show current settings`
            ].join('\n');
            await sock.sendMessage(chatId, { text: usage });
            return;
        }

        // Handle different actions
        switch (action) {
            case 'on':
                await handleEnableAntilink(sock, chatId);
                break;

            case 'off':
                await handleDisableAntilink(sock, chatId);
                break;

            case 'set':
                await handleSetAction(sock, chatId, args[1], prefix);
                break;

            case 'get':
                await handleGetStatus(sock, chatId);
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_Invalid command. Use ${prefix}antilink for usage._*` });
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        await sock.sendMessage(chatId, { text: '*_Error processing antilink command_*' });
    }
}

async function handleEnableAntilink(sock, chatId) {
    const existingConfig = await getAntilink(chatId);
    if (existingConfig?.enabled) {
        await sock.sendMessage(chatId, { text: '*_Antilink is already enabled_*' });
        return;
    }
    
    const result = await setAntilink(chatId, { enabled: true, action: 'delete' });
    await sock.sendMessage(chatId, { 
        text: result ? '*_Antilink has been enabled (default action: delete)_*' : '*_Failed to enable Antilink_*' 
    });
}

async function handleDisableAntilink(sock, chatId) {
    await removeAntilink(chatId);
    await sock.sendMessage(chatId, { text: '*_Antilink has been disabled_*' });
}

async function handleSetAction(sock, chatId, action, prefix) {
    if (!action) {
        await sock.sendMessage(chatId, { 
            text: `*_Please specify an action: \`${prefix}antilink set delete | kick | warn\`_*` 
        });
        return;
    }
    
    if (!ACTIONS.includes(action)) {
        await sock.sendMessage(chatId, { 
            text: '*_Invalid action. Choose delete, kick, or warn._*' 
        });
        return;
    }
    
    const result = await setAntilink(chatId, { action });
    await sock.sendMessage(chatId, { 
        text: result ? `*_Antilink action set to ${action}_*` : '*_Failed to set Antilink action_*' 
    });
}

async function handleGetStatus(sock, chatId) {
    const config = await getAntilink(chatId) || {};
    const statusText = [
        '*_Antilink Configuration:_*',
        `Status: ${config.enabled ? 'ON' : 'OFF'}`,
        `Action: ${config.action || 'Not set'}`,
        `Link Types: ${config.linkTypes ? config.linkTypes.join(', ') : 'All'}`
    ].join('\n');
    
    await sock.sendMessage(chatId, { text: statusText });
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    try {
        const config = await getAntilink(chatId);
        
        // Skip if antilink is disabled or no config
        if (!config?.enabled) return;

        // Check if message contains any links
        const containsLink = Object.entries(LINK_TYPES).some(([type, pattern]) => {
            return pattern.test(userMessage);
        });

        if (!containsLink) return;

        // Handle the detected link based on configured action
        await handleLinkViolation(sock, chatId, message, senderId, config.action);
    } catch (error) {
        console.error('Error in link detection:', error);
    }
}

async function handleLinkViolation(sock, chatId, message, senderId, action = 'delete') {
    try {
        const { key } = message;
        const messageId = key.id;
        const participant = key.participant || senderId;

        // Perform the configured action
        switch (action) {
            case 'delete':
                await sock.sendMessage(chatId, {
                    delete: { 
                        remoteJid: chatId, 
                        fromMe: false, 
                        id: messageId, 
                        participant 
                    },
                });
                break;

            case 'kick':
                await sock.groupParticipantsUpdate(
                    chatId, 
                    [senderId], 
                    'remove'
                );
                break;

            case 'warn':
                // No special action needed, just send warning
                break;
        }

        // Always send a warning message
        const warningText = action === 'kick' 
            ? `@${senderId.split('@')[0]} has been removed for posting links.`
            : `Warning! @${senderId.split('@')[0]}, posting links is not allowed.`;

        await sock.sendMessage(chatId, { 
            text: warningText, 
            mentions: [senderId] 
        });
    } catch (error) {
        console.error('Error handling link violation:', error);
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};