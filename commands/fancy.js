const figlet = require('figlet');
const gradient = require('gradient-string');
const { promisify } = require('util');
const figletAsync = promisify(figlet.text);

// Available fonts with categories
const FONT_CATEGORIES = {
    '3D': ['3D-ASCII', 'Larry 3D', 'Banner3-D'],
    'Banner': ['Banner', 'Banner3', 'Banner4'],
    'Fun': ['Doh', 'Epic', 'Ghost'],
    'Classic': ['Standard', 'Big', 'Block'],
    'Special': ['Univers', 'Slant', 'Alpha']
};

// All fonts flattened
const ALL_FONTS = Object.values(FONT_CATEGORIES).flat();

// Gradient presets
const GRADIENTS = {
    rainbow: gradient.rainbow,
    pastel: gradient.pastel,
    fruit: gradient.fruit,
    insta: gradient.instagram,
    retro: gradient.retro,
    summer: gradient.summer,
    teen: gradient.teen
};

class FancyTextGenerator {
    constructor() {
        this.maxLength = 200; // Character limit for text
    }

    async generate({ sock, chatId, rawText, message }) {
        try {
            const args = rawText.split('.fancy')[1]?.trim();
            
            if (!args || args === 'help') {
                return this.showHelp(sock, chatId, message);
            }

            // Parse command arguments
            const { text, font, gradientName, error } = this.parseArguments(args);
            if (error) {
                return sock.sendMessage(chatId, {
                    text: error,
                    quoted: message
                });
            }

            // Validate text length
            if (text.length > this.maxLength) {
                return sock.sendMessage(chatId, {
                    text: `❌ Text too long! Maximum ${this.maxLength} characters allowed.`,
                    quoted: message
                });
            }

            // Generate fancy text
            const result = await this.generateFancyText(text, font, gradientName);
            
            // Send result
            await sock.sendMessage(chatId, {
                text: result,
                quoted: message,
                contextInfo: this.getContextInfo()
            });

        } catch (error) {
            console.error('Fancy text error:', error);
            await sock.sendMessage(chatId, {
                text: '⚠️ Failed to generate fancy text!',
                quoted: message
            });
        }
    }

    parseArguments(args) {
        const parts = args.split(' ');
        const flags = {
            gradient: null,
            font: 'Standard'
        };

        // Extract flags and font
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i];
            
            if (part.startsWith('-g:')) {
                flags.gradient = part.slice(3);
                parts.splice(i, 1);
            } else if (part === '-g') {
                flags.gradient = 'rainbow';
                parts.splice(i, 1);
            } else if (ALL_FONTS.includes(part)) {
                flags.font = part;
                parts.splice(i, 1);
            }
        }

        const text = parts.join(' ').trim();
        
        if (!text) {
            return { error: '❌ Please provide text to stylize!' };
        }

        if (flags.gradient && !GRADIENTS[flags.gradient]) {
            return { error: `❌ Invalid gradient! Available: ${Object.keys(GRADIENTS).join(', ')}` };
        }

        return {
            text,
            font: flags.font,
            gradientName: flags.gradient,
            error: null
        };
    }

    async generateFancyText(text, font, gradientName) {
        const data = await figletAsync(text, { font });
        
        if (gradientName) {
            return GRADIENTS[gradientName].multiline(data);
        }
        
        return `\`\`\`${data}\`\`\``;
    }

    showHelp(sock, chatId, message) {
        let helpText = '✨ *Fancy Text Generator*\n\n';
        helpText += 'Usage: *.fancy <text> [options]*\n\n';
        helpText += 'Examples:\n';
        helpText += '• .fancy Hello\n';
        helpText += '• .fancy Hello -g\n';
        helpText += '• .fancy Hello -g:pastel\n';
        helpText += '• .fancy Hello 3D-ASCII\n\n';
        
        helpText += '*Options:*\n';
        helpText += '• -g : Add rainbow gradient\n';
        helpText += '• -g:<name> : Specific gradient\n';
        helpText += '• <font> : Font style (see below)\n\n';
        
        helpText += '*Available Gradients:*\n';
        helpText += Object.keys(GRADIENTS).map(g => `• ${g}`).join('\n') + '\n\n';
        
        helpText += '*Font Categories:*\n';
        for (const [category, fonts] of Object.entries(FONT_CATEGORIES)) {
            helpText += `*${category}:*\n${fonts.map(f => `• ${f}`).join('\n')}\n\n`;
        }

        return sock.sendMessage(chatId, {
            text: helpText,
            quoted: message,
            contextInfo: this.getContextInfo()
        });
    }

    getContextInfo() {
        return {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363401680775438@newsletter',
                newsletterName: '𝐙𝐔𝐊𝐎-𝐌𝐃',
                serverMessageId: -1
            }
        };
    }
}

module.exports = new FancyTextGenerator();