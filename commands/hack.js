// commands/hack.js
const fs = require('fs');
const { channelInfo } = require('../main');

module.exports = {
    name: "hack",
    desc: "Displays a dynamic and playful 'Hacking' message for fun.",
    category: "fun",
    async handle(sock, chatId, message, args) {
        try {
            // Check if sender is bot owner (fromMe)
            if (!message.key.fromMe) {
                await sock.sendMessage(chatId, { 
                    text: "❌ Only the bot owner can use this command.",
                    ...channelInfo 
                });
                return;
            }

            const steps = [
                '💻 *HACK STARTING...* 💻',
                '*Initializing hacking tools...* 🛠️',
                '*Connecting to remote servers...* 🌐',
                '```[██████████] 10%``` ⏳',
                '```[███████████████████] 20%``` ⏳',
                '```[███████████████████████] 30%``` ⏳',
                '```[██████████████████████████] 40%``` ⏳',
                '```[███████████████████████████████] 50%``` ⏳',
                '```[█████████████████████████████████████] 60%``` ⏳',
                '```[██████████████████████████████████████████] 70%``` ⏳',
                '```[██████████████████████████████████████████████] 80%``` ⏳',
                '```[██████████████████████████████████████████████████] 90%``` ⏳',
                '```[████████████████████████████████████████████████████] 100%``` ✅',
                '🔒 *System Breach: Successful!* 🔓',
                '🚀 *Command Execution: Complete!* 🎯',
                '*📡 Transmitting data...* 📤',
                '_🕵️‍♂️ Ensuring stealth..._ 🤫',
                '*🔧 Finalizing operations...* 🏁',
                '⚠️ *Note:* All actions are for demonstration purposes only.',
                '⚠️ *Reminder:* Ethical hacking is the only way to ensure security.',
                '> *𝐙𝐔𝐊𝐎-𝐌𝐃-HACKING-COMPLETE ☣*'
            ];

            for (const line of steps) {
                await sock.sendMessage(chatId, { 
                    text: line, 
                    ...channelInfo 
                }, { quoted: message });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (e) {
            console.error('Error in hack command:', e);
            await sock.sendMessage(chatId, { 
                text: `❌ Error: ${e.message}`,
                ...channelInfo 
            });
        }
    }
};