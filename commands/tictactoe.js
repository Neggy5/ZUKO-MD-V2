const TicTacToe = require('../lib/tictactoe');
const { generateId } = require('../lib/utils');

// Game configuration
const GAME_CONFIG = {
    MAX_GAME_TIME: 300000, // 5 minutes
    INACTIVITY_TIMEOUT: 120000, // 2 minutes
    EMOJI_MAP: {
        'X': '❎',
        'O': '⭕',
        '1': '1️⃣',
        '2': '2️⃣',
        '3': '3️⃣',
        '4': '4️⃣',
        '5': '5️⃣',
        '6': '6️⃣',
        '7': '7️⃣',
        '8': '8️⃣',
        '9': '9️⃣'
    }
};

// Game state management
const games = {};
const gameTimeouts = {};

class TicTacToeGame {
    constructor(playerX, roomName = '') {
        this.id = `tictactoe-${generateId()}`;
        this.game = new TicTacToe(playerX, 'o');
        this.state = 'WAITING';
        this.roomName = roomName;
        this.createdAt = Date.now();
        this.lastActivity = Date.now();
        this.playerXChat = '';
        this.playerOChat = '';
        this.timeout = null;
    }

    getBoard() {
        return this.game.render().map(v => GAME_CONFIG.EMOJI_MAP[v] || v);
    }

    getStatus() {
        const winner = this.game.winner;
        const isTie = this.game.turns === 9;
        const currentPlayer = this.game.currentTurn.split('@')[0];

        if (winner) {
            return {
                text: `🎉 @${winner.split('@')[0]} wins the game!`,
                gameOver: true
            };
        } else if (isTie) {
            return {
                text: `🤝 Game ended in a draw!`,
                gameOver: true
            };
        } else {
            return {
                text: `🎲 Turn: @${currentPlayer} (${this.game.currentTurn === this.game.playerX ? '❎' : '⭕'})`,
                gameOver: false
            };
        }
    }

    formatBoard() {
        const board = this.getBoard();
        return `
${board.slice(0, 3).join('')}
${board.slice(3, 6).join('')}
${board.slice(6).join('')}`;
    }

    async startGame(sock, playerOChat, playerO) {
        this.state = 'PLAYING';
        this.playerOChat = playerOChat;
        this.game.playerO = playerO;
        this.updateActivity();

        const status = this.getStatus();
        const mentions = [this.game.currentTurn, this.game.playerX, this.game.playerO];

        const message = `🎮 *TicTacToe Game Started!*\n\n` +
                       `${status.text}\n` +
                       this.formatBoard() + `\n\n` +
                       `▢ Player ❎: @${this.game.playerX.split('@')[0]}\n` +
                       `▢ Player ⭕: @${this.game.playerO.split('@')[0]}\n\n` +
                       `• Type a number (1-9) to place your symbol\n` +
                       `• Type *surrender* to give up`;

        await this.sendToBoth(sock, message, mentions);
        this.setTimeout(sock);
    }

    async makeMove(sock, senderId, move) {
        if (this.state !== 'PLAYING') return false;
        if (this.game.currentTurn !== senderId) return false;

        const isSurrender = /^(surrender|give up|quit)$/i.test(move);
        
        if (isSurrender) {
            await this.handleSurrender(sock, senderId);
            return true;
        }

        if (!/^[1-9]$/.test(move)) return false;

        const position = parseInt(move) - 1;
        const isValidMove = this.game.turn(
            senderId === this.game.playerO,
            position
        );

        if (!isValidMove) return false;

        this.updateActivity();
        await this.updateGameState(sock);
        return true;
    }

    async handleSurrender(sock, senderId) {
        const winner = senderId === this.game.playerX ? this.game.playerO : this.game.playerX;
        
        await this.sendToBoth(sock, 
            `🏳️ @${senderId.split('@')[0]} has surrendered! @${winner.split('@')[0]} wins the game!`,
            [senderId, winner]
        );
        
        this.endGame();
    }

    async updateGameState(sock) {
        const status = this.getStatus();
        const mentions = [
            this.game.playerX, 
            this.game.playerO,
            ...(status.gameOver ? [] : [this.game.currentTurn])
        ];

        const message = `🎮 *TicTacToe Game*\n\n` +
                       `${status.text}\n` +
                       this.formatBoard() + `\n\n` +
                       `▢ Player ❎: @${this.game.playerX.split('@')[0]}\n` +
                       `▢ Player ⭕: @${this.game.playerO.split('@')[0]}\n\n` +
                       `${!status.gameOver ? '• Type a number (1-9) to make your move\n• Type *surrender* to give up' : ''}`;

        await this.sendToBoth(sock, message, mentions);

        if (status.gameOver) {
            this.endGame();
        } else {
            this.setTimeout(sock);
        }
    }

    async sendToBoth(sock, text, mentions = []) {
        try {
            await sock.sendMessage(this.playerXChat, { text, mentions });
            if (this.playerOChat && this.playerXChat !== this.playerOChat) {
                await sock.sendMessage(this.playerOChat, { text, mentions });
            }
        } catch (error) {
            console.error('Error sending game update:', error);
        }
    }

    setTimeout(sock) {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.handleTimeout(sock);
        }, GAME_CONFIG.INACTIVITY_TIMEOUT);
    }

    async handleTimeout(sock) {
        const inactivePlayer = this.game.currentTurn.split('@')[0];
        await this.sendToBoth(sock, 
            `⏰ Game ended due to inactivity. @${inactivePlayer} took too long to move.`,
            [this.game.currentTurn]
        );
        this.endGame();
    }

    updateActivity() {
        this.lastActivity = Date.now();
    }

    endGame() {
        clearTimeout(this.timeout);
        this.state = 'ENDED';
        delete games[this.id];
        delete gameTimeouts[this.id];
    }
}

// Command Handlers
async function tictactoeCommand(sock, chatId, senderId, text) {
    try {
        // Check if player is already in a game
        const existingGame = findPlayerGame(senderId);
        if (existingGame) {
            await sock.sendMessage(chatId, { 
                text: '❌ You are already in a game. Type *surrender* to quit.',
                mentions: [senderId]
            });
            return;
        }

        // Look for existing waiting room
        const roomName = text.trim();
        const waitingRoom = findWaitingRoom(roomName);

        if (waitingRoom) {
            // Join existing room
            waitingRoom.startGame(sock, chatId, senderId);
        } else {
            // Create new room
            const newGame = new TicTacToeGame(senderId, roomName);
            newGame.playerXChat = chatId;
            games[newGame.id] = newGame;

            await sock.sendMessage(chatId, { 
                text: `⏳ *Waiting for opponent*${roomName ? ` (Room: ${roomName})` : ''}\n\nType *.ttt ${roomName || ''}* to join!`
            });

            // Set timeout for waiting room
            gameTimeouts[newGame.id] = setTimeout(() => {
                if (newGame.state === 'WAITING') {
                    sock.sendMessage(chatId, { 
                        text: '⌛ Game lobby expired. No one joined.'
                    });
                    delete games[newGame.id];
                    delete gameTimeouts[newGame.id];
                }
            }, GAME_CONFIG.MAX_GAME_TIME);
        }

    } catch (error) {
        console.error('Error in tictactoe command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error starting game. Please try again.' 
        });
    }
}

async function handleTicTacToeMove(sock, chatId, senderId, text) {
    try {
        const game = findPlayerGame(senderId);
        if (!game) return;

        const move = text.trim();
        const isValidMove = await game.makeMove(sock, senderId, move);

        if (!isValidMove && /^[1-9]$/.test(move)) {
            await sock.sendMessage(chatId, { 
                text: '❌ Invalid move! That position is already taken or it\'s not your turn.',
                mentions: [senderId]
            });
        }

    } catch (error) {
        console.error('Error in tictactoe move:', error);
    }
}

// Helper Functions
function findPlayerGame(playerId) {
    return Object.values(games).find(game => 
        [game.game.playerX, game.game.playerO].includes(playerId) && 
        game.state === 'PLAYING'
    );
}

function findWaitingRoom(roomName = '') {
    return Object.values(games).find(game => 
        game.state === 'WAITING' && 
        game.roomName === roomName
    );
}

module.exports = {
    tictactoeCommand,
    handleTicTacToeMove,
    // For testing/management
    _games: games
};