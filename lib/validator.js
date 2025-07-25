const { isJidGroup, isJidUser, jidNormalizedUser } = require('@whiskeysockets/baileys');

/**
 * Validation utilities for ZUKO-MD bot
 */
module.exports = {
    /**
     * Validate phone number format
     * @param {string} number - Phone number to validate
     * @returns {boolean} True if valid format
     */
    validatePhoneNumber: (number) => {
        // International format validation (without +)
        return /^[1-9]\d{9,14}$/.test(number.replace(/[+\-\s]/g, ''));
    },

    /**
     * Validate WhatsApp JID
     * @param {string} jid - JID to validate
     * @returns {boolean} True if valid JID
     */
    validateJid: (jid) => {
        try {
            return isJidUser(jidNormalizedUser(jid));
        } catch {
            return false;
        }
    },

    /**
     * Validate group JID
     * @param {string} jid - JID to validate
     * @returns {boolean} True if valid group JID
     */
    validateGroupJid: (jid) => {
        try {
            return isJidGroup(jid);
        } catch {
            return false;
        }
    },

    /**
     * Validate URL format
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
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email
     */
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Validate date format (YYYY-MM-DD)
     * @param {string} date - Date to validate
     * @returns {boolean} True if valid date
     */
    validateDate: (date) => {
        return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
    },

    /**
     * Validate time format (HH:MM)
     * @param {string} time - Time to validate
     * @returns {boolean} True if valid time
     */
    validateTime: (time) => {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
    },

    /**
     * Validate numeric input
     * @param {string} input - Input to validate
     * @param {object} options - Validation options
     * @param {number} [options.min] - Minimum value
     * @param {number} [options.max] - Maximum value
     * @returns {boolean} True if valid number
     */
    validateNumber: (input, { min, max } = {}) => {
        const num = parseFloat(input);
        if (isNaN(num)) return false;
        if (min !== undefined && num < min) return false;
        if (max !== undefined && num > max) return false;
        return true;
    },

    /**
     * Validate string length
     * @param {string} input - Input to validate
     * @param {object} options - Validation options
     * @param {number} [options.min] - Minimum length
     * @param {number} [options.max] - Maximum length
     * @returns {boolean} True if valid length
     */
    validateLength: (input, { min, max } = {}) => {
        if (typeof input !== 'string') return false;
        const len = input.length;
        if (min !== undefined && len < min) return false;
        if (max !== undefined && len > max) return false;
        return true;
    },

    /**
     * Validate command arguments
     * @param {string[]} args - Command arguments
     * @param {object} schema - Validation schema
     * @returns {object} { isValid: boolean, message?: string }
     */
    validateArgs: (args, schema) => {
        // Implementation for complex argument validation
        // Can be expanded based on your needs
        return { isValid: true };
    },

    /**
     * Check if string contains only alphanumeric characters
     * @param {string} input - Input to validate
     * @returns {boolean} True if alphanumeric
     */
    isAlphanumeric: (input) => {
        return /^[a-z0-9]+$/i.test(input);
    },

    /**
     * Validate media type
     * @param {string} type - Media type to validate
     * @returns {boolean} True if valid media type
     */
    validateMediaType: (type) => {
        const validTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        return validTypes.includes(type.toLowerCase());
    },

    /**
     * Validate HEX color code
     * @param {string} color - Color code to validate
     * @returns {boolean} True if valid HEX color
     */
    validateHexColor: (color) => {
        return /^#([0-9A-F]{3}){1,2}$/i.test(color);
    }
};