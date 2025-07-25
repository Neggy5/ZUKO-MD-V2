const settings = require('../settings');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { tmpdir } = require('os');

// Modern header design
const botHeader = `
╭──────────────────────────────╮
│⚡ 𝐙𝐔𝐊𝐎-𝐌𝐃 𝐁𝐎𝐓 ${settings.version || '2.0'} ⚡   
├──────────────────────────────┤
│ Creator: ${settings.botOwner || '𝐙𝐔𝐊𝐎'}          
│ YouTube: ${global.ytch || 'BOTKÍNG001'}       │
╰──────────────────────────────╯
`;

async function generateHelpMessage() {
  return `
${botHeader}

╭── 🌍 GENERAL COMMANDS ──╮
│✦ .help/.menu 
│✦ .ping 
│✦ .alive 
│✦ .tts 
│✦ .owner 
│✦ .joke 
│✦ .quote 
│✦ .fact 
│✦ .weather 
│✦ .news 
│✦ .attp 
│✦ .lyrics 
│✦ .8ball 
│✦ .groupinfo
│✦ .staff
│✦ .vv - 
│✦ .pair
│✦ .trt 
│✦ .ss <link> 
╰────────────────────────╯

╭── ⚙️ ADMIN COMMANDS ──╮
│✦ .ban 
│✦ .promote 
│✦ .demote 
│✦ .mute 
│✦ .unmute 
│✦ .delete/.del 
│✦ .kick 
│✦ .warnings 
│✦ .warn 
│✦ .antilink 
│✦ .antibadword 
│✦ .clear 
│✦ .tag <msg> 
│✦ .tagall 
│✦ .chatbot 
│✦ .resetlink 
╰──────────────────────╯

╭── 🔑 OWNER COMMANDS ──╮
│✦ .mode 
│✦ .autostatus
│✦ .clearsession
│✦ .antidelete 
│✦ .cleartmp 
│✦ .setpp <image> 
│✦ .autoreact 
╰──────────────────────╯

╭── 🎨 MEDIA COMMANDS ──╮
│✦ .blur <image> 
│✦ .simage 
│✦ .sticker 
│✦ .tgsticker <url> 
│✦ .meme 
│✦ .take <name> 
│✦ .emojimix 😊+😢 
╰──────────────────────╯

╭── 🎮 GAME COMMANDS ──╮
│✦ .tictactoe @user
│✦ .hangman 
│✦ .guess <letter> 
│✦ .trivia 
│✦ .answer <text>
│✦ .truth 
│✦ .dare 
╰─────────────────────╯

╭── 🤖 AI COMMANDS ──╮
│✦ .gpt <prompt> 
│✦ .gemini <prompt> 
╰─────────────────╯

╭── 😄 FUN COMMANDS ──╮
│✦ .compliment @user 
│✦ .insult @user 
│✦ .flirt 
│✦ .shayari 
│✦ .goodnight
│✦ .roseday 
│✦ .character @user 
│✦ .wasted @user
│✦ .ship @user 
│✦ .simp @user 
│✦ .stupid @user 
╰────────────────────╯

╭── ✨ TEXT ART ──╮
│✦ .metallic <text> 
│✦ .ice <text> 
│✦ .snow <text> 
│✦ .impressive <text> 
│✦ .matrix <text> 
│✦ .light <text> 
│✦ .neon <text>
│✦ .devil <text> 
│✦ .purple <text> 
│✦ .thunder <text> 
│✦ .leaves <text> 
│✦ .1917 <text> 
│✦ .arena <text> 
│✦ .hacker <text>
│✦ .sand <text>
│✦ .blackpink <text> 
│✦ .glitch <text> 
│✦ .fire <text>
╰────────────────╯

╭── 📥 DOWNLOADER ──╮
│✦ .play <song> 
│✦ .song <name> 
│✦ .instagram <url> 
│✦ .facebook <url> 
│✦ .tiktok <url>
╰──────────────────╯

╭── 💻 GITHUB ──╮
│✦ .git 
│✦ .github 
│✦ .sc 
│✦ .script 
│✦ .repo 
╰───────────────╯

🔥 ALL HAIL 𝐙𝐔𝐊𝐎 🔥
`;
}

async function downloadImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const tempPath = path.join(tmpdir(), `zuko_${Date.now()}.jpg`);
    await fs.promises.writeFile(tempPath, response.data);
    return tempPath;
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

async function helpCommand(sock, chatId) {
  try {
    const helpMessage = await generateHelpMessage();
    const imageUrl = 'https://files.catbox.moe/wpt5p6.jpg';
    
    const messageOptions = {
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

    // Try to download the image
    const imagePath = await downloadImage(imageUrl);
    
    if (imagePath) {
      try {
        messageOptions.image = fs.readFileSync(imagePath);
        messageOptions.caption = helpMessage;
      } finally {
        // Clean up the downloaded image
        fs.unlink(imagePath, () => {});
      }
    } else {
      // Fallback to local image if download fails
      const localImagePath = path.join(__dirname, '../assets/ZUKO.jpg');
      if (fs.existsSync(localImagePath)) {
        messageOptions.image = fs.readFileSync(localImagePath);
        messageOptions.caption = helpMessage;
      } else {
        messageOptions.text = helpMessage;
      }
    }

    await sock.sendMessage(chatId, messageOptions);
  } catch (error) {
    console.error('Error sending help menu:', error);
    await sock.sendMessage(chatId, { 
      text: '⚠️ Failed to load help menu. Please try again later.',
      ...messageOptions.contextInfo
    });
  }
}

module.exports = helpCommand;