const fs = require('fs');
const path = require('path');
const settings = require('../settings');

// Enhanced quiz database with more categories and questions
const quizzes = {
    general: [
        {
            question: "What is the capital of France?",
            options: ["London", "Paris", "Berlin", "Madrid"],
            answer: 1,
            difficulty: "easy",
            explanation: "Paris is known as the 'City of Light' and is France's capital."
        },
        {
            question: "Which planet is known as the Red Planet?",
            options: ["Venus", "Mars", "Jupiter", "Saturn"],
            answer: 1,
            difficulty: "easy",
            explanation: "Mars appears red due to iron oxide on its surface."
        }
    ],
    science: [
        {
            question: "What is H2O?",
            options: ["Gold", "Water", "Salt", "Oxygen"],
            answer: 1,
            difficulty: "medium",
            explanation: "H2O is the chemical formula for water."
        }
    ],
    movies: [
        {
            question: "Who directed 'The Dark Knight'?",
            options: ["Steven Spielberg", "Christopher Nolan", "James Cameron", "Martin Scorsese"],
            answer: 1,
            difficulty: "medium",
            explanation: "Christopher Nolan directed the Batman trilogy."
        }
    ]
};

// Active quizzes storage with timeout
const activeQuizzes = new Map();

class QuizGame {
    constructor(chatId, category = 'general') {
        this.chatId = chatId;
        this.category = category;
        this.questions = [...quizzes[category]];
        this.currentQuestion = null;
        this.scores = new Map();
        this.timeout = null;
        this.questionTime = 30000; // 30 seconds per question
        this.shuffleQuestions();
        this.nextQuestion();
    }

    shuffleQuestions() {
        // Shuffle and select 5 questions based on difficulty
        this.questions = this.questions
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);
    }

    nextQuestion() {
        clearTimeout(this.timeout);
        this.currentQuestion = this.questions.pop();
        
        if (this.currentQuestion) {
            this.timeout = setTimeout(() => this.timeOutQuestion(), this.questionTime);
        }
        
        return this.currentQuestion;
    }

    timeOutQuestion() {
        const correctAnswer = this.currentQuestion.options[this.currentQuestion.answer];
        sock.sendMessage(this.chatId, {
            text: `⏰ Time's up! The correct answer was: ${correctAnswer}\n${this.currentQuestion.explanation ? `\n💡 ${this.currentQuestion.explanation}` : ''}`,
            ...settings.channelInfo
        });
        
        if (this.nextQuestion()) {
            sendQuestion(sock, this.chatId, this);
        } else {
            endQuiz(sock, this.chatId, this);
            activeQuizzes.delete(this.chatId);
        }
    }

    checkAnswer(answerIndex) {
        clearTimeout(this.timeout);
        return answerIndex === this.currentQuestion.answer;
    }

    addScore(userId, points = 1) {
        const current = this.scores.get(userId) || 0;
        this.scores.set(userId, current + points);
    }

    getScores() {
        return Array.from(this.scores.entries())
            .sort((a, b) => b[1] - a[1]);
    }
}

async function quizCommand(sock, chatId, message) {
    try {
        const args = message.message?.conversation?.split(' ') || [];
        const category = args[1]?.toLowerCase() || 'general';

        if (!quizzes[category]) {
            const categories = Object.keys(quizzes).map(c => `• ${c}`).join('\n');
            return await sock.sendMessage(chatId, {
                text: `📚 *Quiz Categories*\n\nAvailable categories:\n${categories}\n\nUsage: .quiz [category]`,
                ...settings.channelInfo,
                quoted: message
            });
        }

        // End existing quiz if any
        if (activeQuizzes.has(chatId)) {
            const oldQuiz = activeQuizzes.get(chatId);
            clearTimeout(oldQuiz.timeout);
            activeQuizzes.delete(chatId);
            await sock.sendMessage(chatId, {
                text: "♻️ Previous quiz ended. Starting new one...",
                ...settings.channelInfo
            });
        }

        // Start new quiz
        const quiz = new QuizGame(chatId, category);
        activeQuizzes.set(chatId, quiz);

        await sock.sendMessage(chatId, {
            text: `🎲 *${category.toUpperCase()} Quiz Started!*\n\nGet ready for 5 questions!\nYou have 30 seconds per question.`,
            ...settings.channelInfo
        });

        await sendQuestion(sock, chatId, quiz);

    } catch (error) {
        console.error('Quiz command error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to start quiz. Please try again.',
            ...settings.channelInfo,
            quoted: message
        });
    }
}

async function sendQuestion(sock, chatId, quiz) {
    const question = quiz.currentQuestion;
    const questionText = `📝 *Question ${5 - quiz.questions.length}/5* [${question.difficulty}]\n\n` +
        `${question.question}\n\n` +
        question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n') +
        `\n\n⌛ Reply with the number (1-${question.options.length}) within 30 seconds`;

    await sock.sendMessage(chatId, {
        text: questionText,
        ...settings.channelInfo
    });
}

async function handleQuizAnswer(sock, chatId, userId, answerIndex) {
    try {
        if (!activeQuizzes.has(chatId)) return;

        const quiz = activeQuizzes.get(chatId);
        const answerNum = parseInt(answerIndex);
        const username = userId.split('@')[0];

        if (isNaN(answerNum) || answerNum < 1 || answerNum > quiz.currentQuestion.options.length) {
            return await sock.sendMessage(chatId, {
                text: `Please reply with a number between 1-${quiz.currentQuestion.options.length}`,
                ...settings.channelInfo
            });
        }

        const isCorrect = quiz.checkAnswer(answerNum - 1);
        const correctAnswer = quiz.currentQuestion.options[quiz.currentQuestion.answer];
        
        if (isCorrect) {
            quiz.addScore(userId);
            await sock.sendMessage(chatId, {
                text: `✅ *Correct!* @${username} gets a point!\n\nThe answer was: ${correctAnswer}` +
                      (quiz.currentQuestion.explanation ? `\n\n💡 ${quiz.currentQuestion.explanation}` : ''),
                mentions: [userId],
                ...settings.channelInfo
            });
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ *Wrong!* @${username}\n\nThe correct answer was: ${correctAnswer}` +
                      (quiz.currentQuestion.explanation ? `\n\n💡 ${quiz.currentQuestion.explanation}` : ''),
                mentions: [userId],
                ...settings.channelInfo
            });
        }

        // Next question or end quiz
        if (quiz.nextQuestion()) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            await sendQuestion(sock, chatId, quiz);
        } else {
            await endQuiz(sock, chatId, quiz);
            activeQuizzes.delete(chatId);
        }

    } catch (error) {
        console.error('Quiz answer error:', error);
    }
}

async function endQuiz(sock, chatId, quiz) {
    const scores = quiz.getScores();
    let resultText = '🎉 *Quiz Ended!* 🎉\n\n';
    resultText += `Category: ${quiz.category.toUpperCase()}\n\n`;

    if (scores.length > 0) {
        resultText += '*🏆 Final Scores:*\n';
        resultText += scores.map(([userId, score], i) => 
            `${i + 1}. @${userId.split('@')[0]}: ${score} point${score !== 1 ? 's' : ''}`
        ).join('\n');
        
        // Announce winner
        const winner = scores[0];
        resultText += `\n\n🎖️ *Winner:* @${winner[0].split('@')[0]} with ${winner[1]} points!`;
    } else {
        resultText += 'No one scored any points this time!';
    }

    await sock.sendMessage(chatId, {
        text: resultText,
        mentions: scores.length > 0 ? [scores[0][0]] : [],
        ...settings.channelInfo
    });
}

async function checkQuizAnswer(sock, message) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    const userMessage = message.message?.conversation;

    if (activeQuizzes.has(chatId) {
        const quiz = activeQuizzes.get(chatId);
        const validAnswers = Array.from({length: quiz.currentQuestion.options.length}, (_, i) => `${i + 1}`);
        
        if (userMessage && validAnswers.includes(userMessage.trim())) {
            await handleQuizAnswer(sock, chatId, userId, userMessage);
            return true;
        }
    }
    return false;
}

// Helper function to add more questions
function addQuestions(category, newQuestions) {
    if (!quizzes[category]) {
        quizzes[category] = [];
    }
    quizzes[category].push(...newQuestions);
}

module.exports = {
    quizCommand,
    checkQuizAnswer,
    addQuestions,
    quizzes
};