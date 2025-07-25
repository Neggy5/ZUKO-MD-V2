// commands/antigroupmention.js
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "antigroupmention",
    desc: "Enable/disable protection against excessive group mentions",
    category: "moderation",
    permission: "admin",
    async handle(sock, chatId, message, args) {
        try {
            const dataPath = path.join(__dirname, '../data/antigroupmention.json');
            let data = {};
            
            // Load existing data
            try {
                data = JSON.parse(fs.readFileSync(dataPath));
            } catch (e) {
                console.log("Creating new antigroupmention.json file");
            }

            if (!data[chatId]) {
                data[chatId] = {
                    enabled: false,
                    maxMentions: 5, // Default max mentions allowed
                    action: "warn" // Default action (warn/kick)
                };
            }

            const currentStatus = data[chatId].enabled ? "enabled" : "disabled";
            const [action, value] = args;

            if (!action) {
                // Show current status
                return await sock.sendMessage(chatId, {
                    text: `🛡️ Anti-group-mention is currently *${currentStatus}* for this group.\n\n` +
                          `*Usage:*\n` +
                          `.antigroupmention enable - Enable protection\n` +
                          `.antigroupmention disable - Disable protection\n` +
                          `.antigroupmention setmax 5 - Set max allowed mentions\n` +
                          `.antigroupmention setaction warn - Set action (warn/kick)`,
                    ...channelInfo
                });
            }

            switch (action.toLowerCase()) {
                case 'enable':
                    data[chatId].enabled = true;
                    await sock.sendMessage(chatId, {
                        text: "✅ Anti-group-mention protection has been *enabled* for this group",
                        ...channelInfo
                    });
                    break;

                case 'disable':
                    data[chatId].enabled = false;
                    await sock.sendMessage(chatId, {
                        text: "❌ Anti-group-mention protection has been *disabled* for this group",
                        ...channelInfo
                    });
                    break;

                case 'setmax':
                    const max = parseInt(value);
                    if (isNaN(max) {
                        return await sock.sendMessage(chatId, {
                            text: "Please provide a valid number for max mentions",
                            ...channelInfo
                        });
                    }
                    data[chatId].maxMentions = max;
                    await sock.sendMessage(chatId, {
                        text: `🔢 Max mentions set to *${max}* per message`,
                        ...channelInfo
                    });
                    break;

                case 'setaction':
                    if (!['warn', 'kick'].includes(value?.toLowerCase())) {
                        return await sock.sendMessage(chatId, {
                            text: "Invalid action. Use 'warn' or 'kick'",
                            ...channelInfo
                        });
                    }
                    data[chatId].action = value.toLowerCase();
                    await sock.sendMessage(chatId, {
                        text: `⚡ Action set to *${value.toLowerCase()}* for violators`,
                        ...channelInfo
                    });
                    break;

                default:
                    await sock.sendMessage(chatId, {
                        text: "Invalid subcommand. Use .antigroupmention help for usage",
                        ...channelInfo
                    });
            }

            // Save the updated data
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

        } catch (error) {
            console.error("Error in antigroupmention command:", error);
            await sock.sendMessage(chatId, {
                text: "❌ Failed to process anti-group-mention command",
                ...channelInfo
            });
        }
    }
};