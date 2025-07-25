const axios = require('axios');
const { delay } = require('../lib/utils');
const { validatePhoneNumber } = require('../lib/validators');

// Pairing Service Configuration
const PAIRING_SERVICE = {
    BASE_URL: 'https://zuko-md-v2-id.onrender.com/code',
    TIMEOUT: 10000, // 10 seconds
    RETRY_COUNT: 2,
    RETRY_DELAY: 2000 // 2 seconds between retries
};

// Command Handler
async function pairCommand(sock, chatId, message, q) {
    try {
        // Validate input
        if (!q) {
            return sendMessage(sock, chatId, {
                text: "📱 *Pairing Command*\n\nPlease provide a valid WhatsApp number\n\n*Example:* `.pair 23490790XXX`\n*Multiple numbers:* `.pair 23490790XXX, 1234567890`",
                quoted: message
            });
        }

        // Process numbers
        const numbers = processPhoneNumbers(q);
        if (numbers.length === 0) {
            return sendMessage(sock, chatId, {
                text: "❌ *Invalid Input*\nPlease provide valid WhatsApp numbers in international format\n\n*Example:* `.pair 23490790XXX`",
                quoted: message
            });
        }

        // Process each number
        for (const number of numbers) {
            await processSingleNumber(sock, chatId, message, number);
        }

    } catch (error) {
        console.error('Pair Command Error:', error);
        await sendMessage(sock, chatId, {
            text: "⚠️ An unexpected error occurred. Please try again later.",
            quoted: message
        });
    }
}

// Helper Functions
function processPhoneNumbers(input) {
    return input.split(',')
        .map(num => num.replace(/[^0-9]/g, ''))
        .filter(num => validatePhoneNumber(num));
}

async function processSingleNumber(sock, chatId, message, number) {
    try {
        // Check WhatsApp registration
        const whatsappID = `${number}@s.whatsapp.net`;
        const [result] = await sock.onWhatsApp(whatsappID);

        if (!result?.exists) {
            return sendMessage(sock, chatId, {
                text: `❌ The number *${number}* is not registered on WhatsApp`,
                quoted: message
            });
        }

        // Show processing message
        const processingMsg = await sendMessage(sock, chatId, {
            text: `⏳ Generating pairing code for *${number}*...`,
            quoted: message
        });

        // Get pairing code with retry logic
        const code = await getPairingCodeWithRetry(number);

        // Delete processing message
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        // Send result
        await sendMessage(sock, chatId, {
            text: `🔑 *Pairing Code for ${number}*\n\n\`\`\`${code}\`\`\`\n\nThis code will expire in 5 minutes.`,
            quoted: message
        });

    } catch (error) {
        console.error('Number Processing Error:', error);
        await handlePairingError(sock, chatId, message, error);
    }
}

async function getPairingCodeWithRetry(number, attempt = 0) {
    try {
        const response = await axios.get(`${PAIRING_SERVICE.BASE_URL}?number=${number}`, {
            timeout: PAIRING_SERVICE.TIMEOUT
        });

        if (!response.data?.code || response.data.code === "Service Unavailable") {
            throw new Error('Service returned invalid response');
        }

        return response.data.code;

    } catch (error) {
        if (attempt < PAIRING_SERVICE.RETRY_COUNT) {
            await delay(PAIRING_SERVICE.RETRY_DELAY);
            return getPairingCodeWithRetry(number, attempt + 1);
        }
        throw error;
    }
}

async function handlePairingError(sock, chatId, message, error) {
    let errorMessage = "⚠️ Failed to generate pairing code";

    if (error.message.includes('Service Unavailable') || error.response?.status === 503) {
        errorMessage = "🚧 Pairing service is currently unavailable\nPlease try again later";
    } else if (error.code === 'ECONNABORTED') {
        errorMessage = "⏱️ Request timed out\nPlease try again in a moment";
    }

    await sendMessage(sock, chatId, {
        text: errorMessage,
        quoted: message
    });
}

async function sendMessage(sock, chatId, { text, quoted, ...options }) {
    return sock.sendMessage(chatId, {
        text,
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363401680775438@newsletter',
                newsletterName: '𝐙𝐔𝐊𝐎-𝐌𝐃',
                serverMessageId: -1
            }
        },
        ...options
    }, { quoted });
}

module.exports = {
    pairCommand,
    // Exported for testing
    _private: {
        processPhoneNumbers,
        processSingleNumber,
        getPairingCodeWithRetry
    }
};