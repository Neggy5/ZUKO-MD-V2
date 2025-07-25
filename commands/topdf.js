const fs = require('fs');
const path = require('path');
const { getBuffer } = require('../lib/myfunc');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const { fromBuffer } = require('file-type');

module.exports = async (sock, chatId, msg) => {
    try {
        // Supported file types for conversion
        const supportedTypes = [
            'image/jpeg', 'image/png', 'image/webp',
            'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        // Check if message has media or is text
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mediaMessage = quotedMsg || msg.message;
        
        let pdfBuffer;
        let fileName = 'converted_file.pdf';

        if (mediaMessage.imageMessage || mediaMessage.documentMessage) {
            // Handle media files (images/documents)
            const fileType = mediaMessage.documentMessage 
                ? mediaMessage.documentMessage.mimetype 
                : 'image/jpeg';
            
            if (!supportedTypes.includes(fileType)) {
                return sock.sendMessage(chatId, {
                    text: `❌ Unsupported file type. Supported types:\n${supportedTypes.join('\n')}`,
                    ...channelInfo
                });
            }

            const mediaBuffer = await getBuffer(mediaMessage, mediaMessage.documentMessage ? 'document' : 'image');
            const fileInfo = await fromBuffer(mediaBuffer);
            
            // Create PDF
            const doc = new PDFDocument();
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            
            if (fileInfo.mime.startsWith('image/')) {
                doc.image(mediaBuffer, {
                    fit: [500, 700],
                    align: 'center',
                    valign: 'center'
                });
                fileName = 'converted_image.pdf';
            } else {
                // For documents (like .docx), we'd need a more complex converter
                // This is a basic text placeholder
                doc.text('Document conversion would go here', { align: 'center' });
                fileName = 'converted_document.pdf';
            }
            
            doc.end();
            pdfBuffer = Buffer.concat(buffers);
            
        } else if (msg.message.conversation || msg.message.extendedTextMessage) {
            // Handle text messages
            const text = msg.message.conversation || msg.message.extendedTextMessage.text;
            
            const doc = new PDFDocument();
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            
            doc.fontSize(12).text(text, {
                align: 'left',
                width: 410,
                indent: 30
            });
            
            doc.end();
            pdfBuffer = Buffer.concat(buffers);
            fileName = 'converted_text.pdf';
        } else {
            return sock.sendMessage(chatId, {
                text: '❌ Please send or reply to a document, image, or text message to convert to PDF',
                ...channelInfo
            });
        }

        // Send the PDF
        await sock.sendMessage(chatId, {
            document: pdfBuffer,
            mimetype: 'application/pdf',
            fileName: fileName,
            ...channelInfo
        });

    } catch (error) {
        console.error('Error in topdf command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to convert to PDF. Please try again with a different file.',
            ...channelInfo
        });
    }
};

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