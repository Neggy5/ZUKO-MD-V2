const fs = require('fs').promises;
const path = require('path');
const { validatePhoneNumber, validateEmail } = require('../lib/validator');
const { generateId } = require('../lib/utils');

module.exports = async ({ sock, chatId, message, args }) => {
    try {
        // Show help if no arguments
        if (!args.length) {
            return showVcfHelp(sock, chatId, message);
        }

        // Parse and validate input
        const { name, phone, email, org, error } = parseVcfInput(args);
        if (error) {
            return sock.sendMessage(chatId, {
                text: error,
                quoted: message,
            });
        }

        // Generate VCF content
        const vcfContent = generateVcfContent({ name, phone, email, org });

        // Create temp directory if not exists
        const tempDir = path.join(__dirname, '../temp');
        await fs.mkdir(tempDir, { recursive: true });

        // Save to temp file
        const filePath = path.join(tempDir, `contact_${generateId()}.vcf`);
        await fs.writeFile(filePath, vcfContent);

        // Send VCF file
        await sendVcfFile(sock, chatId, message, filePath, name);

        // Cleanup
        await cleanupTempFile(filePath);

    } catch (error) {
        console.error('VCF error:', error);
        await handleVcfError(sock, chatId, message, error);
    }
};

// Helper Functions
function showVcfHelp(sock, chatId, message) {
    return sock.sendMessage(chatId, {
        text: `📇 *VCF Contact Card Generator*\n\n` +
              `*Usage:* \`!vcf <name>|<phone>|[email]|[org]\`\n\n` +
              `*Example:*\n` +
              `• Basic: \`!vcf John Doe|+1234567890\`\n` +
              `• Full: \`!vcf John Doe|+1234567890|john@doe.com|ACME Inc.\`\n\n` +
              `*Note:* Only name and phone are required.`,
        quoted: message,
    });
}

function parseVcfInput(args) {
    const [name, phone, email, org] = args.join(' ').split('|').map(s => s.trim());
    const errors = [];

    // Validate required fields
    if (!name) errors.push('• Name is required');
    if (!phone) errors.push('• Phone number is required');
    if (phone && !validatePhoneNumber(phone)) errors.push('• Invalid phone number format');
    if (email && !validateEmail(email)) errors.push('• Invalid email format');

    if (errors.length > 0) {
        return {
            error: `❌ *Validation Errors:*\n${errors.join('\n')}\n\n` +
                   `*Correct Format:* \`!vcf Name|Phone|Email|Organization\``
        };
    }

    return { name, phone, email, org };
}

function generateVcfContent({ name, phone, email, org }) {
    const vcfLines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${escapeVcfField(name)}`,
        `TEL;TYPE=CELL,VOICE:${escapeVcfField(phone)}`,
        email && `EMAIL:${escapeVcfField(email)}`,
        org && `ORG:${escapeVcfField(org)}`,
        `REV:${new Date().toISOString()}`,
        'END:VCARD'
    ];

    return vcfLines.filter(Boolean).join('\n');
}

function escapeVcfField(field) {
    if (!field) return '';
    return field.replace(/[,;\\]/g, '\\$&');
}

async function sendVcfFile(sock, chatId, message, filePath, name) {
    const fileName = `${name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_')}.vcf`;
    
    await sock.sendMessage(chatId, {
        document: { url: filePath },
        fileName: fileName,
        mimetype: 'text/vcard',
        caption: `📇 *Contact Card*\n` +
                 `Name: ${name}\n` +
                 `Saved as: ${fileName}`,
        quoted: message,
    });
}

async function cleanupTempFile(filePath) {
    try {
        await fs.unlink(filePath);
    } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError);
    }
}

async function handleVcfError(sock, chatId, message, error) {
    let errorMessage = '❌ Failed to generate VCF file';
    
    if (error.code === 'ENOENT') {
        errorMessage += '\n\n⚠️ Could not create temporary directory';
    } else if (error.message.includes('validation')) {
        errorMessage = error.message;
    }

    await sock.sendMessage(chatId, {
        text: errorMessage + '\n\nTry again or check the format.',
        quoted: message,
    });
}