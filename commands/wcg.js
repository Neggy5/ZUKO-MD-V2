const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { format } = require('date-fns');
const { delay } = require('../utils/helpers');

// Game database with enhanced metadata
const WCG_GAMES = {
    'trivia': {
        name: 'Cyber Trivia',
        desc: 'Answer tech/gaming questions',
        handler: triviaGame,
        maxPlayers: 10,
        duration: 30000,
        difficulty: ['easy', 'medium', 'hard']
    },
    'typing': {
        name: 'Speed Typing',
        desc: 'Type the sentence fastest',
        handler: typingGame,
        maxPlayers: 15,
        duration: 45000
    },
    'math': {
        name: 'Math Duel',
        desc: 'Solve math problems quickly',
        handler: mathDuel,
        maxPlayers: 2,
        duration: 60000,
        operations: ['+', '-', '*', '/']
    },
    'emoji': {
        name: 'Emoji Challenge',
        desc: 'Guess the game from emojis',
        handler: emojiGame,
        maxPlayers: 20,
        duration: 40000
    }
};

// Active game sessions with cleanup scheduler
const activeGames = new Map();
setInterval(cleanupExpiredGames, 60000); // Cleanup every minute

class WCGManager {
    static async handleCommand(sock, chatId, message, args) {
        const [subcmd, ...gameArgs] = args;

        try {
            switch(subcmd?.toLowerCase()) {
                case 'start':
                    return this.handleGameStart(sock, chatId, message, gameArgs);
                case 'leaderboard':
                    return this.showLeaderboard(sock, chatId);
                case 'list':
                    return this.listGames(sock, chatId);
                case 'end':
                    return this.endGame(sock, chatId, message, gameArgs);
                default:
                    return this.showHelp(sock, chatId);
            }
        } catch (error) {
            console.error('WCG Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '⚠️ An error occurred. Please try again later.'
            });
        }
    }

    static async handleGameStart(sock, chatId, message, args) {
        const [gameChoice, difficulty] = args.map(a => a?.toLowerCase());
        
        if (!WCG_GAMES[gameChoice]) {
            return this.listGames(sock, chatId, true);
        }

        // Check for existing game in chat
        for (const [_, game] of activeGames) {
            if (game.chatId === chatId) {
                return sock.sendMessage(chatId, {
                    text: `⚠️ There's already a ${game.type} game in progress!`
                });
            }
        }

        return WCG_GAMES[gameChoice].handler(sock, chatId, message, difficulty);
    }

    static async listGames(sock, chatId, isError = false) {
        const gameList = Object.entries(WCG_GAMES)
            .map(([id, {name, desc, maxPlayers}]) => 
                `• *${name}* (${id}) - ${desc}\n  👥 Max players: ${maxPlayers}`)
            .join('\n\n');
        
        await sock.sendMessage(chatId, {
            text: `${isError ? '❌ Invalid game choice!\n\n' : ''}🎮 *Available WCG Games*\n\n${gameList}\n\n` +
                  `Usage: .wcg start [game_id] [difficulty]`
        });
    }

    static async showLeaderboard(sock, chatId) {
        try {
            // In a real implementation, fetch from database
            const leaderboard = await this.fetchLeaderboard();
            
            await sock.sendMessage(chatId, {
                text: `🏆 *WCG Leaderboard*\n\n` +
                      `${leaderboard.map((p, i) => 
                          `${i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`} ${p.name}: ${p.score}pts (${p.wins} wins)`
                      ).join('\n')}\n\n` +
                      `Play more games to climb the ranks!`
            });
        } catch (error) {
            console.error('Leaderboard Error:', error);
            await sock.sendMessage(chatId, {
                text: '⚠️ Could not load leaderboard. Try again later.'
            });
        }
    }

    static async fetchLeaderboard() {
        // Mock data - replace with actual database query
        return [
            { name: "CyberNinja", score: 1200, wins: 15 },
            { name: "GameMaster", score: 950, wins: 12 },
            { name: "PixelWarrior", score: 800, wins: 8 },
            { name: "CodeBreaker", score: 750, wins: 7 },
            { name: "ByteKing", score: 600, wins: 5 }
        ];
    }

    static async showHelp(sock, chatId) {
        await sock.sendMessage(chatId, {
            text: `🕹️ *WCG Commands*\n\n` +
                  `.wcg start [game] - Start a game\n` +
                  `.wcg list - Show all available games\n` +
                  `.wcg leaderboard - Show top players\n` +
                  `.wcg end [game_id] - End game early\n\n` +
                  `Tip: Use ".wcg start [game] help" for game-specific help`
        });
    }
}

// --- GAME HANDLERS --- //

async function triviaGame(sock, chatId, message, difficulty = 'medium') {
    const gameId = uuidv4();
    
    try {
        const { data } = await axios.get(
            `https://opentdb.com/api.php?amount=1&category=15&difficulty=${difficulty}`
        );
        
        if (!data.results?.length) {
            throw new Error('No questions available');
        }

        const question = data.results[0];
        const options = [...question.incorrect_answers, question.correct_answer]
            .sort(() => Math.random() - 0.5)
            .map(decodeHtml);

        const gameData = {
            type: 'trivia',
            chatId,
            question: decodeHtml(question.question),
            options,
            correct: decodeHtml(question.correct_answer),
            players: new Map(),
            startedAt: Date.now(),
            expires: Date.now() + WCG_GAMES.trivia.duration
        };

        activeGames.set(gameId, gameData);
        
        await sock.sendMessage(chatId, {
            text: `🎮 *Cyber Trivia Challenge* (${difficulty}) 🎮\n\n` +
                  `💡 ${gameData.question}\n\n` +
                  `${options.map((o, i) => `${i+1}. ${o}`).join('\n')}\n\n` +
                  `Reply with: .answer ${gameId} [number]\n` +
                  `⏳ ${WCG_GAMES.trivia.duration/1000}s remaining`,
            mentions: []
        });

        // Auto-end game when time expires
        setTimeout(() => endGame(sock, gameId), WCG_GAMES.trivia.duration);

    } catch (error) {
        console.error('Trivia Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to start trivia. Try ".wcg start trivia easy" for easier questions.'
        });
    }
}

async function typingGame(sock, chatId) {
    const sentences = [
        "The quick brown fox jumps over the lazy dog",
        "Pack my box with five dozen liquor jugs",
        "How vexingly quick daft zebras jump",
        "Waltz bad nymph for quick jigs vex"
    ];
    
    const sentence = sentences[Math.floor(Math.random() * sentences.length)];
    const gameId = uuidv4();
    
    const gameData = {
        type: 'typing',
        chatId,
        target: sentence,
        players: new Map(),
        startedAt: Date.now(),
        expires: Date.now() + WCG_GAMES.typing.duration
    };

    activeGames.set(gameId, gameData);
    
    await sock.sendMessage(chatId, {
        text: `⌨️ *Speed Typing Challenge* ⌨️\n\n` +
              `Type this EXACTLY:\n\n"${sentence}"\n\n` +
              `First to type it perfectly wins!\n` +
              `⏳ ${WCG_GAMES.typing.duration/1000}s remaining`
    });

    setTimeout(() => endGame(sock, gameId), WCG_GAMES.typing.duration);
}

// --- GAME MANAGEMENT --- //

async function endGame(sock, gameId, announce = true) {
    if (!activeGames.has(gameId)) return;

    const game = activeGames.get(gameId);
    const winners = [...game.players.entries()]
        .filter(([_, {correct}]) => correct)
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

    if (announce) {
        const resultText = winners.length 
            ? `🏆 *Winner*: @${winners[0][0].split('@')[0]} was first!\n` +
              `Total participants: ${game.players.size}`
            : `❌ Game ended with no winners!`;
        
        await sock.sendMessage(game.chatId, {
            text: `🛑 *Game Over*: ${WCG_GAMES[game.type].name}\n\n${resultText}`,
            mentions: winners.length ? [winners[0][0]] : []
        });
    }

    activeGames.delete(gameId);
    // Here you would update player stats in database
}

function cleanupExpiredGames() {
    const now = Date.now();
    for (const [gameId, game] of activeGames) {
        if (game.expires < now) {
            endGame(null, gameId, false).catch(console.error);
        }
    }
}

// --- ANSWER HANDLER --- //

async function handleGameAnswer(sock, chatId, userId, gameId, answer) {
    if (!activeGames.has(gameId)) {
        return sock.sendMessage(chatId, { 
            text: '⚠️ Game session expired or invalid',
            mentions: [userId]
        });
    }
    
    const game = activeGames.get(gameId);
    if (game.players.has(userId)) {
        return sock.sendMessage(chatId, { 
            text: `@${userId.split('@')[0]} You already participated!`,
            mentions: [userId]
        });
    }

    let isCorrect = false;
    let response = '';

    switch(game.type) {
        case 'trivia':
            const selected = game.options[parseInt(answer) - 1];
            isCorrect = selected === game.correct;
            response = isCorrect 
                ? `✅ Correct! "${selected}" was right!`
                : `❌ Wrong! The correct answer was "${game.correct}"`;
            break;
            
        case 'typing':
            isCorrect = answer.trim() === game.target;
            response = isCorrect 
                ? `🎉 Perfect typing!`
                : `⚠️ Not exact match. Try again!`;
            break;
    }

    game.players.set(userId, {
        correct: isCorrect,
        timestamp: Date.now()
    });

    await sock.sendMessage(chatId, {
        text: `${response}\n@${userId.split('@')[0]} ${isCorrect ? 'got it right!' : 'try again!'}`,
        mentions: [userId]
    });

    // End game immediately if max players reached
    if (game.players.size >= WCG_GAMES[game.type].maxPlayers) {
        await endGame(sock, gameId);
    }
}

// --- HELPER FUNCTIONS --- //

function decodeHtml(html) {
    const entities = {
        '&quot;': '"', '&amp;': '&', '&lt;': '<', 
        '&gt;': '>', '&nbsp;': ' ', '&copy;': '©'
    };
    return html.replace(/&[^;]+;/g, e => entities[e] || e);
}

module.exports = {
    WCGManager,
    handleGameAnswer,
    activeGames
};