const axios = require('axios');

module.exports = async function (sock, chatId) {
    try {
        const apiKey = 'dcd720a6f1914e2d9dba9790c188c08c';  // Replace with your NewsAPI key
        const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`);
        const articles = response.data.articles.slice(0, 5); // Get top 5 articles
        
        let newsMessage = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃      📰 *LATEST NEWS*      ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim();

        articles.forEach((article, index) => {
            newsMessage += `
┌──────────────────────
│ *${index + 1}. ${article.title}*
│ ${article.description || 'No description available'}
│ 
│ Read more: ${article.url}
╰──────────────────────`;
        });

        await sock.sendMessage(chatId, { 
            image: { url: 'https://files.catbox.moe/wpt5p6.jpg' },
            caption: newsMessage,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363401680775438@newsletter',
                    newsletterName: '𝐙𝐔𝐊𝐎-𝐌𝐃',
                    serverMessageId: -1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        await sock.sendMessage(chatId, { 
            text: '╭━━━━━━━━━━━━━━━━━━━━━━╮\n┃   ❌ NEWS FETCH ERROR   ┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯\nSorry, I could not fetch news right now.' 
        });
    }
};