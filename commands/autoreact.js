// commands/autoreact.js
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "autoreact",
    desc: "Automatically react to messages with specified emojis",
    category: "fun",
    permission: "admin",
    async handle(sock, chatId, message, args) {
        try {
            const dataPath = path.join(__dirname, '../data/autoreact.json');
            let data = {};
            
            // Load existing data
            try {
                data = JSON.parse(fs.readFileSync(dataPath));
            } catch (e) {
                console.log("Creating new autoreact.json file");
            }

            if (!data[chatId]) {
                data[chatId] = {
                    enabled: false,
                    emojis: ["👍"], // Default reaction
                    skipCommands: true // Skip messages starting with .
                };
            }

            const currentStatus = data[chatId].enabled ? "enabled" : "disabled";
            const [action, ...values] = args;

            if (!action) {
                // Show current status
                return await sock.sendMessage(chatId, {
                    text: `🤖 Auto-reaction is currently *${currentStatus}* for this group.\n\n` +
                          `*Current emojis:* ${data[chatId].emojis.join(' ')}\n\n` +
                          `*Usage:*\n` +
                          `.autoreact enable - Enable auto-reaction\n` +
                          `.autoreact disable - Disable auto-reaction\n` +
                          `.autoreact add 👍 🎉 - Add emoji reactions\n` +
                          `.autoreact remove 👍 - Remove emoji reaction\n` +
                          `.autoreact list - Show current reactions\n` +
                          `.autoreact skipcommands on/off - Toggle skipping command messages`,
                    ...channelInfo
                });
            }

            switch (action.toLowerCase()) {
                case 'enable':
                    data[chatId].enabled = true;
                    await sock.sendMessage(chatId, {
                        text: "✅ Auto-reaction has been *enabled* for this group",
                        ...channelInfo
                    });
                    break;

                case 'disable':
                    data[chatId].enabled = false;
                    await sock.sendMessage(chatId, {
                        text: "❌ Auto-reaction has been *disabled* for this group",
                        ...channelInfo
                    });
                    break;

                case 'add':
                    if (!values.length) {
                        return await sock.sendMessage(chatId, {
                            text: "Please provide at least one emoji to add",
                            ...channelInfo
                        });
                    }
                    data[chatId].emojis = [...new Set([...data[chatId].emojis, ...values])];
                    await sock.sendMessage(chatId, {
                        text: `➕ Added emojis: ${values.join(' ')}`,
                        ...channelInfo
                    });
                    break;

                case 'remove':
                    if (!values.length) {
                        return await sock.sendMessage(chatId, {
                            text: "Please provide at least one emoji to remove",
                            ...channelInfo
                        });
                    }
                    data[chatId].emojis = data[chatId].emojis.filter(e => !values.includes(e));
                    await sock.sendMessage(chatId, {
                        text: `➖ Removed emojis: ${values.join(' ')}`,
                        ...channelInfo
                    });
                    break;

                case 'list':
                    await sock.sendMessage(chatId, {
                        text: `📋 Current auto-reaction emojis:\n${data[chatId].emojis.join(' ')}`,
                        ...channelInfo
                    });
                    return; // Don't save for list command

                case 'skipcommands':
                    const setting = values[0]?.toLowerCase();
                    if (!['on', 'off'].includes(setting)) {
                        return await sock.sendMessage(chatId, {
                            text: "Please specify 'on' or 'off'",
                            ...channelInfo
                        });
                    }
                    data[chatId].skipCommands = setting === 'on';
                    await sock.sendMessage(chatId, {
                        text: `⚙️ Skipping command messages is now *${setting}*`,
                        ...channelInfo
                    });
                    break;

                default:
                    await sock.sendMessage(chatId, {
                        text: "Invalid subcommand. Use .autoreact help for usage",
                        ...channelInfo
                    });
            }

            // Save the updated data
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

        } catch (error) {
            console.error("Error in autoreact command:", error);
            await sock.sendMessage(chatId, {
                text: "❌ Failed to process auto-reaction command",
                ...channelInfo
            });
        }
    }
};