const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Utility functions for ZUKO-MD bot
 */
module.exports = {
    /**
     * Generate a random alphanumeric ID
     * @param {number} length - Length of the ID to generate
     * @returns {string} Random ID
     */
    generateId: (length = 8) => {
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    },

    /**
     * Format duration in milliseconds to human readable format
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted duration (e.g. "2h 5m 30s")
     */
    formatDuration: (ms) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        
        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        
        return parts.join(' ');
    },

    /**
     * Validate a URL
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid URL
     */
    validateUrl: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Parse mention from message
     * @param {object} message - WhatsApp message object
     * @returns {string[]} Array of mentioned JIDs
     */
    parseMentions: (message) => {
        if (!message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            return [];
        }
        return message.extendedTextMessage.contextInfo.mentionedJid;
    },

    /**
     * Delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Read JSON file with error handling
     * @param {string} filePath - Path to JSON file
     * @returns {object|null} Parsed JSON or null if error
     */
    readJson: (filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
            return null;
        } catch (error) {
            console.error('Error reading JSON file:', error);
            return null;
        }
    },

    /**
     * Write JSON file with error handling
     * @param {string} filePath - Path to JSON file
     * @param {object} data - Data to write
     * @returns {boolean} True if successful
     */
    writeJson: (filePath, data) => {
        try {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing JSON file:', error);
            return false;
        }
    },

    /**
     * Format bytes to human readable size
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size (e.g. "1.23 MB")
     */
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Sanitize string for file names
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeFilename: (str) => {
        return str.replace(/[^a-z0-9\-_]/gi, '_').slice(0, 100);
    },

    /**
     * Check if user is admin in a group
     * @param {object} sock - WhatsApp socket
     * @param {string} chatId - Group JID
     * @param {string} userId - User JID
     * @returns {Promise<boolean>} True if user is admin
     */
    isAdmin: async (sock, chatId, userId) => {
        try {
            const metadata = await sock.groupMetadata(chatId);
            return metadata.participants.some(
                p => p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin')
            );
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    },

    /**
     * HTML entity decoder
     * @param {string} html - String with HTML entities
     * @returns {string} Decoded string
     */
    decodeHtml: (html) => {
        const entities = {
            '&quot;': '"', '&amp;': '&', '&lt;': '<', 
            '&gt;': '>', '&nbsp;': ' ', '&copy;': '©'
        };
        return html.replace(/&[^;]+;/g, e => entities[e] || e);
    },

    /**
     * Get current timestamp in formatted string
     * @returns {string} Formatted timestamp
     */
    getTimestamp: () => {
        return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    },

    /**
     * Generate progress bar
     * @param {number} current - Current value
     * @param {number} max - Maximum value
     * @param {number} width - Bar width in characters
     * @returns {string} Progress bar string
     */
    progressBar: (current, max, width = 20) => {
        const ratio = Math.min(Math.max(current / max, 0), 1);
        const filled = Math.round(ratio * width);
        const empty = width - filled;
        return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(ratio * 100)}%`;
    },

    /**
     * Extract text from message object
     * @param {object} message - WhatsApp message object
     * @returns {string} Extracted text
     */
    extractText: (message) => {
        if (message.conversation) return message.conversation;
        if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
        if (message.imageMessage?.caption) return message.imageMessage.caption;
        if (message.videoMessage?.caption) return message.videoMessage.caption;
        return '';
    },

    /**
     * Validate phone number format
     * @param {string} number - Phone number to validate
     * @returns {boolean} True if valid format
     */
    validatePhoneNumber: (number) => {
        return /^[1-9]\d{9,14}$/.test(number.replace(/[+\-\s]/g, ''));
    }
};