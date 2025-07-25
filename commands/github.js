async function githubCommand(sock, chatId) {
    const repoInfo = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃       *✨ 𝐙𝐔𝐊𝐎-𝐌𝐃 ✨*       ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
┌───────────────────────────┐
│  *📂 GitHub Repository:*   │
│  https://github.com/Neggy5/ZUKO-MD
├───────────────────────────┤
│  *📺 Official Channel:*    │
│  https://youtube.com/@BOTKING001
├───────────────────────────┤
│  _Star ⭐ the repository_  │
│  _if you like the bot!_   │
╰───────────────────────────╯
`.trim();

    try {
        await sock.sendMessage(chatId, {
            image: { url: 'https://files.catbox.moe/wpt5p6.jpg' },
            caption: repoInfo,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363401680775438@newsletter',
                    newsletterName: '𝐙𝐔𝐊𝐎-𝐌𝐃✘',
                    serverMessageId: -1
                }
            }
        });
    } catch (error) {
        console.error('Error in github command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error fetching repository information.' 
        });
    }
}

module.exports = githubCommand;