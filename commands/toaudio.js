const fs = require('fs');
const path = require('path');
const { getBuffer } = require('../lib/myfunc');
const ffmpeg = require('fluent-ffmpeg');

module.exports = async (sock, chatId, msg) => {
    try {
        // Check if message is a reply
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMsg) {
            return sock.sendMessage(chatId, {
                text: '❌ Please reply to a video or voice message with .toaudio',
                ...channelInfo
            });
        }

        // Check message type
        const isVideo = quotedMsg.videoMessage;
        const isVoice = quotedMsg.audioMessage && quotedMsg.audioMessage.ptt;
        
        if (!isVideo && !isVoice) {
            return sock.sendMessage(chatId, {
                text: '❌ Only video and voice messages can be converted to audio',
                ...channelInfo
            });
        }

        // Download the media
        const mediaType = isVideo ? 'video' : 'audio';
        const mediaBuffer = await getBuffer(quotedMsg, mediaType);
        const tempInput = path.join(__dirname, '../temp', `${Date.now()}_input.${isVideo ? 'mp4' : 'ogg'}`);
        const tempOutput = path.join(__dirname, '../temp', `${Date.now()}_output.mp3`);

        fs.writeFileSync(tempInput, mediaBuffer);

        // Convert to MP3 using FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(tempInput)
                .audioCodec('libmp3lame')
                .audioBitrate(128)
                .toFormat('mp3')
                .on('end', resolve)
                .on('error', reject)
                .save(tempOutput);
        });

        // Send the audio file
        const audioBuffer = fs.readFileSync(tempOutput);
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            ...channelInfo
        });

        // Clean up temp files
        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);

    } catch (error) {
        console.error('Error in toaudio command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to convert media to audio. Please try again.',
            ...channelInfo
        });
        
        // Clean up temp files if they exist
        try {
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
            if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        } catch (cleanError) {
            console.error('Error cleaning temp files:', cleanError);
        }
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