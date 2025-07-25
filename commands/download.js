const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ytdl = require('ytdl-core');
const { exec } = require('child_process');
const settings = require('../settings');

// Create temp directory if not exists
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Enhanced platform handlers with timeouts
const downloadHandlers = {
    youtube: {
        regex: /(youtube\.com|youtu\.be)/,
        handler: downloadYouTube,
        maxDuration: 600 // 10 minutes
    },
    instagram: {
        regex: /instagram\.com/,
        handler: downloadInstagram,
        maxDuration: 60 // 1 minute
    },
    tiktok: {
        regex: /tiktok\.com/,
        handler: downloadTikTok,
        maxDuration: 180 // 3 minutes
    },
    facebook: {
        regex: /facebook\.com|fb\.watch/,
        handler: downloadFacebook,
        maxDuration: 300 // 5 minutes
    }
};

async function downloadCommand(sock, chatId, message) {
    try {
        const url = extractUrl(message);
        if (!url) {
            return await sendHelpMessage(sock, chatId, message);
        }

        const platform = identifyPlatform(url);
        if (!platform) {
            return await sock.sendMessage(chatId, {
                text: '❌ Unsupported platform. Currently supports:\n\n' +
                      '• YouTube (videos/shorts)\n' +
                      '• Instagram (reels/posts)\n' +
                      '• TikTok (videos)\n' +
                      '• Facebook (videos)',
                ...settings.channelInfo,
                quoted: message
            });
        }

        // Send processing message
        const processingMsg = await sock.sendMessage(chatId, {
            text: '⏳ Processing your download request...\n\n' +
                  `🔗 ${url}\n` +
                  `📌 Detected: ${platform.name.toUpperCase()}`,
            ...settings.channelInfo,
            quoted: message
        });

        // Handle download with timeout
        const result = await Promise.race([
            platform.handler(url),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Download timeout exceeded')), platform.maxDuration * 1000)
            )
        ]);

        if (result.success) {
            await sendMedia(sock, chatId, result, message);
            
            // Clean up temp files
            if (result.filePath && fs.existsSync(result.filePath)) {
                fs.unlink(result.filePath, () => {});
            }
            
            // Delete processing message
            await sock.sendMessage(chatId, {
                delete: processingMsg.key
            });
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ Download failed:\n${result.error || 'Unknown error'}`,
                ...settings.channelInfo,
                quoted: message
            });
        }

    } catch (error) {
        console.error('Download error:', error);
        await sock.sendMessage(chatId, {
            text: '⚠️ Download failed. Possible issues:\n\n' +
                  '• Invalid or private content\n' +
                  '• Server timeout\n' +
                  '• Unsupported content type\n\n' +
                  'Try again or use a different link.',
            ...settings.channelInfo,
            quoted: message
        });
    }
}

// Enhanced platform handlers
async function downloadYouTube(url) {
    try {
        const info = await ytdl.getInfo(url);
        
        // Check duration limit
        const duration = parseInt(info.videoDetails.lengthSeconds);
        if (duration > downloadHandlers.youtube.maxDuration) {
            return { 
                success: false, 
                error: `Video too long (${Math.floor(duration/60)}min). Max: 10min` 
            };
        }

        const format = ytdl.chooseFormat(info.formats, { 
            quality: 'highest',
            filter: format => format.hasVideo && format.hasAudio
        });

        const tempPath = path.join(tempDir, `yt_${Date.now()}.mp4`);
        const writer = fs.createWriteStream(tempPath);
        
        ytdl(url, { format: format }).pipe(writer);
        
        return new Promise((resolve) => {
            writer.on('finish', () => resolve({
                success: true,
                filePath: tempPath,
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails.sort((a, b) => 
                    (b.width || 0) - (a.width || 0))[0].url,
                isVideo: true,
                source: 'YouTube'
            }));
            writer.on('error', (err) => resolve({ 
                success: false, 
                error: `YouTube download failed: ${err.message}` 
            }));
        });
    } catch (error) {
        return { 
            success: false, 
            error: `YouTube error: ${error.message}` 
        };
    }
}

async function downloadInstagram(url) {
    try {
        const response = await axios.get(
            `https://api.downgram.xyz/api/download?url=${encodeURIComponent(url)}`,
            { timeout: 15000 }
        );
        
        const mediaUrl = response.data.videoUrl || response.data.imageUrl;
        if (!mediaUrl) {
            return { success: false, error: 'No media found on Instagram post' };
        }

        const isVideo = mediaUrl.includes('.mp4');
        const tempPath = path.join(tempDir, `ig_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
        
        await downloadFile(mediaUrl, tempPath);
        
        return {
            success: true,
            filePath: tempPath,
            isVideo,
            source: 'Instagram'
        };
    } catch (error) {
        return { 
            success: false, 
            error: `Instagram error: ${error.response?.data?.message || error.message}` 
        };
    }
}

async function downloadTikTok(url) {
    try {
        const response = await axios.get(
            `https://api.tikmate.app/api/info?url=${encodeURIComponent(url)}`,
            { timeout: 15000 }
        );
        
        const videoUrl = response.data.videoUrl;
        if (!videoUrl) {
            return { success: false, error: 'No video found on TikTok' };
        }

        const tempPath = path.join(tempDir, `tt_${Date.now()}.mp4`);
        await downloadFile(videoUrl, tempPath);
        
        return {
            success: true,
            filePath: tempPath,
            isVideo: true,
            source: 'TikTok'
        };
    } catch (error) {
        return { 
            success: false, 
            error: `TikTok error: ${error.message}` 
        };
    }
}

async function downloadFacebook(url) {
    try {
        const response = await axios.get(
            `https://getmyfb.com/api?url=${encodeURIComponent(url)}`,
            { timeout: 15000 }
        );
        
        const videoUrl = response.data.hd || response.data.sd;
        if (!videoUrl) {
            return { success: false, error: 'No video found on Facebook' };
        }

        const tempPath = path.join(tempDir, `fb_${Date.now()}.mp4`);
        await downloadFile(videoUrl, tempPath);
        
        return {
            success: true,
            filePath: tempPath,
            isVideo: true,
            source: 'Facebook'
        };
    } catch (error) {
        return { 
            success: false, 
            error: `Facebook error: ${error.message}` 
        };
    }
}

// Helper functions
async function sendHelpMessage(sock, chatId, message) {
    return await sock.sendMessage(chatId, {
        text: `📥 *${settings.botName} Media Downloader*\n\n` +
              `Usage: .download <URL>\n\n` +
              `Supported platforms:\n` +
              `• YouTube (videos, shorts)\n` +
              `• Instagram (reels, posts)\n` +
              `• TikTok (videos)\n` +
              `• Facebook (videos)\n\n` +
              `Examples:\n` +
              `.download https://youtu.be/...\n` +
              `.download https://instagram.com/reel/...`,
        ...settings.channelInfo,
        quoted: message
    });
}

function identifyPlatform(url) {
    const [name, config] = Object.entries(downloadHandlers).find(([_, cfg]) => 
        cfg.regex.test(url)
    ) || [];
    
    return name ? { name, ...config } : null;
}

async function downloadFile(url, filePath) {
    const writer = fs.createWriteStream(filePath);
    const response = await axios.get(url, { 
        responseType: 'stream',
        timeout: 30000 
    });
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function sendMedia(sock, chatId, mediaInfo, originalMsg) {
    try {
        const fileBuffer = fs.readFileSync(mediaInfo.filePath);
        const caption = `📥 Downloaded from ${mediaInfo.source}\n` +
                       (mediaInfo.title ? `📌 ${mediaInfo.title}\n\n` : '') +
                       `🔗 ${originalMsg.message?.conversation?.match(/(https?:\/\/[^\s]+)/)?.[0] || ''}`;

        const messageOptions = {
            caption: caption.trim(),
            contextInfo: {
                mentionedJid: originalMsg?.key?.participant ? [originalMsg.key.participant] : [],
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: settings.channelInfo.forwardedNewsletterMessageInfo
            }
        };

        if (mediaInfo.isVideo) {
            await sock.sendMessage(chatId, {
                video: fileBuffer,
                ...messageOptions,
                ...(mediaInfo.thumbnail ? { thumbnail: await getBuffer(mediaInfo.thumbnail) } : {})
            });
        } else {
            await sock.sendMessage(chatId, {
                image: fileBuffer,
                ...messageOptions
            });
        }
    } catch (error) {
        console.error('Send media error:', error);
        throw error;
    }
}

async function getBuffer(url) {
    try {
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: 10000 
        });
        return Buffer.from(response.data, 'binary');
    } catch {
        return undefined;
    }
}

module.exports = {
    downloadCommand
};