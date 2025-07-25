const axios = require('axios');
const { delay } = require('@whiskeysockets/baileys');
const { decodeHtmlEntities } = require('../lib/utils');

// Game configuration
const TRIVIA_CONFIG = {
    MAX_GAME_TIME: 30000, // 30 seconds per question
    MAX_PLAYERS: 20,
    QUESTION_TIMEOUT: 8000, // API timeout
    RETRY_ATTEMPTS: 2,
    POINTS: {
        easy: 1,
        medium: 2,
        hard: 3,
        bonus: { // Bonus for fast answers
            '0-10': 2, // First 10 seconds
            '10-20': 1 // Next 10 seconds
        }
    }
};

// Game state management
const triviaGames = {};
const playerStats = {}; // Tracks wins, points, etc.

class TriviaGame {
    constructor(chatId) {
        this.chatId = chatId;
        this.state = 'waiting'; // waiting, active, ended
        this.timeout = null;
        this.playersAnswered = new Set();
    }

    async start(sock) {
        try {
            this.state = 'active';
            this.startTime = Date.now();

            // Fetch question with retry logic
            const question = await this.fetchQuestionWithRetry();
            if (!question) throw new Error('Failed to get question');

            // Store game data
            this.question = question.question;
            this.correctAnswer = question.correctAnswer;
            this.options = question.options;
            this.difficulty = question.difficulty;
            this.category = question.category;

            // Send question
            await this.sendQuestion(sock);

            // Set timeout
            this.timeout = setTimeout(() => this.end(sock, false), TRIVIA_CONFIG.MAX_GAME_TIME);

        } catch (error) {
            console.error('Game start error:', error);
            this.state = 'ended';
            await sock.sendMessage(this.chatId, {
                text: '❌ Failed to start trivia. Please try again later.'
            });
        }
    }

    async fetchQuestionWithRetry(attempt = 0) {
        try {
            const response = await axios.get('https://opentdb.com/api.php', {
                params: {
                    amount: 1,
                    type: 'multiple',
                    encode: 'url3986'
                },
                timeout: TRIVIA_CONFIG.QUESTION_TIMEOUT
            });

            if (!response.data?.results?.length) {
                throw new Error('No questions returned');
            }

            const questionData = response.data.results[0];
            return {
                question: decodeHtmlEntities(questionData.question),
                correctAnswer: decodeHtmlEntities(questionData.correct_answer),
                options: [...questionData.incorrect_answers.map(decodeHtmlEntities), 
                         decodeHtmlEntities(questionData.correct_answer)]
                    .sort(() => Math.random() - 0.5),
                difficulty: questionData.difficulty,
                category: decodeHtmlEntities(questionData.category)
            };

        } catch (error) {
            if (attempt < TRIVIA_CONFIG.RETRY_ATTEMPTS) {
                await delay(1000 * (attempt + 1));
                return this.fetchQuestionWithRetry(attempt + 1);
            }
            throw error;
        }
    }

    async sendQuestion(sock) {
        const message = `🎲 *Trivia Time!* (${this.difficulty}) 🎲\n\n` +
                       `📌 *Category*: ${this.category}\n` +
                       `⏳ *Time Limit*: ${TRIVIA_CONFIG.MAX_GAME_TIME/1000}s\n\n` +
                       `❓ *Question*: ${this.question}\n\n` +
                       `📝 *Options*:\n${this.options.map((opt, i) => `${i+1}. ${opt}`).join('\n')}\n\n` +
                       `💡 Reply with: .answer [number] or [text]\n` +
                       `🏆 *Top Players*: ${this.getTopPlayers(3)}`;

        await sock.sendMessage(this.chatId, { text: message });
    }

    async processAnswer(sock, userId, answer) {
        if (this.state !== 'active') {
            await sock.sendMessage(this.chatId, {
                text: '⚠️ No active trivia game. Start one with .trivia',
                mentions: [userId]
            });
            return false;
        }

        // Prevent duplicate answers
        if (this.playersAnswered.has(userId)) {
            await sock.sendMessage(this.chatId, {
                text: `@${userId.split('@')[0]} You already answered!`,
                mentions: [userId]
            });
            return false;
        }

        this.playersAnswered.add(userId);

        // Check answer
        const { isCorrect, selectedAnswer } = this.checkAnswer(answer);
        const responseTime = Date.now() - this.startTime;
        const points = this.calculatePoints(isCorrect, responseTime);

        // Update player stats
        this.updatePlayerStats(userId, points, isCorrect);

        // Send response
        await this.sendAnswerResponse(sock, userId, isCorrect, selectedAnswer, points);

        // Check if game should end
        if (this.playersAnswered.size >= TRIVIA_CONFIG.MAX_PLAYERS) {
            await this.end(sock, true);
        }

        return true;
    }

    checkAnswer(answer) {
        let isCorrect = false;
        let selectedAnswer = '';

        // Check numeric answer
        if (/^\d+$/.test(answer)) {
            const optionIndex = parseInt(answer) - 1;
            selectedAnswer = this.options[optionIndex] || '';
            isCorrect = selectedAnswer === this.correctAnswer;
        } 
        // Check text answer
        else {
            selectedAnswer = answer;
            isCorrect = answer.toLowerCase() === this.correctAnswer.toLowerCase();
        }

        return { isCorrect, selectedAnswer };
    }

    calculatePoints(isCorrect, responseTime) {
        if (!isCorrect) return 0;

        let points = TRIVIA_CONFIG.POINTS[this.difficulty] || 1;

        // Add time bonus
        for (const [range, bonus] of Object.entries(TRIVIA_CONFIG.POINTS.bonus)) {
            const [min, max] = range.split('-').map(Number);
            if (responseTime >= min * 1000 && responseTime < max * 1000) {
                points += bonus;
                break;
            }
        }

        return points;
    }

    updatePlayerStats(userId, points, isCorrect) {
        if (!playerStats[userId]) {
            playerStats[userId] = {
                points: 0,
                correct: 0,
                wrong: 0,
                games: 0
            };
        }

        const player = playerStats[userId];
        player.points += points;
        if (isCorrect) player.correct++;
        else player.wrong++;
    }

    async sendAnswerResponse(sock, userId, isCorrect, selectedAnswer, points) {
        const userTag = `@${userId.split('@')[0]}`;
        let message;

        if (isCorrect) {
            message = `🎉 *Correct!* ${userTag} (+${points} pts)\n` +
                      `✅ ${this.correctAnswer}`;
        } else {
            message = `❌ ${userTag} answered: "${selectedAnswer}"\n` +
                      `The correct answer was: ${this.correctAnswer}`;
        }

        await sock.sendMessage(this.chatId, {
            text: message,
            mentions: [userId]
        });
    }

    getTopPlayers(limit = 5) {
        return Object.entries(playerStats)
            .sort((a, b) => b[1].points - a[1].points)
            .slice(0, limit)
            .map(([id, stats], i) => `${i+1}. @${id.split('@')[0]}: ${stats.points}`)
            .join(', ') || 'None yet';
    }

    async end(sock, isManual) {
        if (this.state === 'ended') return;

        this.state = 'ended';
        clearTimeout(this.timeout);

        // Update game counts
        this.playersAnswered.forEach(userId => {
            if (playerStats[userId]) playerStats[userId].games++;
        });

        // Send final results
        const winner = Object.entries(playerStats)
            .sort((a, b) => b[1].points - a[1].points)[0];

        let endMessage = `🏁 *Trivia Ended* 🏁\n\n` +
                         `📌 *Category*: ${this.category}\n` +
                         `⚡ *Difficulty*: ${this.difficulty}\n\n` +
                         `✅ *Correct Answer*: ${this.correctAnswer}\n\n` +
                         `👥 *Participants*: ${this.playersAnswered.size}`;

        if (winner) {
            endMessage += `\n\n🏆 *Top Player*: @${winner[0].split('@')[0]} (${winner[1].points} pts)`;
        }

        await sock.sendMessage(this.chatId, { 
            text: endMessage,
            mentions: winner ? [winner[0]] : []
        });

        // Clean up
        delete triviaGames[this.chatId];
    }
}

// Command Handlers
async function startTrivia(sock, chatId) {
    if (triviaGames[chatId]) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ A trivia game is already in progress!'
        });
        return;
    }

    const game = new TriviaGame(chatId);
    triviaGames[chatId] = game;
    await game.start(sock);
}

async function answerTrivia(sock, chatId, answer, userId) {
    const game = triviaGames[chatId];
    if (!game) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ No active trivia game. Start one with .trivia',
            mentions: [userId]
        });
        return;
    }

    await game.processAnswer(sock, userId, answer);
}

async function endTrivia(sock, chatId) {
    const game = triviaGames[chatId];
    if (!game) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ No active trivia game to end'
        });
        return;
    }

    await game.end(sock, true);
}

async function showLeaderboard(sock, chatId, limit = 5) {
    const topPlayers = Object.entries(playerStats)
        .sort((a, b) => b[1].points - a[1].points)
        .slice(0, limit);

    if (topPlayers.length === 0) {
        await sock.sendMessage(chatId, { 
            text: '📊 No trivia stats yet. Play a game first!'
        });
        return;
    }

    const leaderboard = topPlayers.map(([id, stats], i) => 
        `${i+1}. @${id.split('@')[0]} - ${stats.points} pts (${stats.correct}/${stats.correct + stats.wrong})`
    ).join('\n');

    await sock.sendMessage(chatId, {
        text: `🏆 *Trivia Leaderboard* 🏆\n\n${leaderboard}\n\nUse .trivia to play!`
    });
}

module.exports = {
    startTrivia,
    answerTrivia,
    endTrivia,
    showLeaderboard,
    // For testing/management
    _triviaGames: triviaGames,
    _playerStats: playerStats
};