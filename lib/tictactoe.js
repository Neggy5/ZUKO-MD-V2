class TicTacToe {
    constructor(playerX = 'x', playerO = 'o') {
        this.playerX = playerX;
        this.playerO = playerO;
        this._currentTurn = false; // false = X's turn, true = O's turn
        this._x = 0; // Bitmask for X's moves (9 bits)
        this._o = 0; // Bitmask for O's moves (9 bits)
        this.turns = 0;
        this._history = [];
        this._winningCombination = null;
        this._winningPlayer = null;
        this._gameOver = false;
        
        // Precompute all possible winning patterns (8 total)
        this.WINNING_PATTERNS = Object.freeze([
            0b111000000, 0b000111000, 0b000000111, // Rows
            0b100100100, 0b010010010, 0b001001001, // Columns
            0b100010001, 0b001010100               // Diagonals
        ]);
    }

    get board() {
        return this._x | this._o;
    }

    get currentTurn() {
        return this._currentTurn ? this.playerO : this.playerX;
    }

    get winner() {
        if (this._winningPlayer !== null) return this._winningPlayer;
        
        // Check if either player has a winning pattern
        for (const pattern of this.WINNING_PATTERNS) {
            if ((this._x & pattern) === pattern) {
                this._winningCombination = pattern;
                this._winningPlayer = this.playerX;
                this._gameOver = true;
                return this.playerX;
            }
            if ((this._o & pattern) === pattern) {
                this._winningCombination = pattern;
                this._winningPlayer = this.playerO;
                this._gameOver = true;
                return this.playerO;
            }
        }

        return null;
    }

    get isDraw() {
        return this.turns === 9 && !this.winner;
    }

    get isGameOver() {
        return this._gameOver || this.isDraw;
    }

    get winningCombination() {
        return this._winningCombination;
    }

    get history() {
        return Object.freeze([...this._history]);
    }

    turn(player, pos) {
        // Validate input
        if (this.isGameOver) {
            return { status: 'error', message: 'Game is already over' };
        }

        if (typeof pos !== 'number' || pos < 0 || pos > 8) {
            return { status: 'error', message: 'Invalid position (must be 0-8)' };
        }

        // Check if it's the player's turn
        const expectedPlayer = this._currentTurn ? this.playerO : this.playerX;
        if (player !== expectedPlayer) {
            return { status: 'error', message: `It's ${expectedPlayer}'s turn` };
        }

        // Check if position is already taken
        const positionBit = 1 << pos;
        if (this.board & positionBit) {
            return { status: 'error', message: 'Position already taken' };
        }

        // Make the move
        if (this._currentTurn) {
            this._o |= positionBit;
        } else {
            this._x |= positionBit;
        }

        // Record the move
        this._history.push({
            player,
            position: pos,
            turn: this.turns + 1,
            timestamp: Date.now()
        });

        this._currentTurn = !this._currentTurn;
        this.turns++;

        // Check game state after move
        const result = {
            status: 'success',
            currentTurn: this.currentTurn,
            board: this.render(),
            turnNumber: this.turns
        };

        // Check for winner or draw
        if (this.winner) {
            result.status = 'win';
            result.winner = this.winner;
            result.winningCombination = this.getWinningPositions();
        } else if (this.isDraw) {
            result.status = 'draw';
        }

        return result;
    }

    getWinningPositions() {
        if (!this._winningCombination) return null;
        
        const positions = [];
        for (let i = 0; i < 9; i++) {
            if (this._winningCombination & (1 << i)) {
                positions.push(i);
            }
        }
        return positions;
    }

    render(emojiMap = null) {
        const board = [];
        for (let i = 0; i < 9; i++) {
            const bit = 1 << i;
            if (this._x & bit) {
                board.push(emojiMap?.X || 'X');
            } else if (this._o & bit) {
                board.push(emojiMap?.O || 'O');
            } else {
                board.push(emojiMap?.[i+1] || (i + 1));
            }
        }
        return board;
    }

    prettyPrint(emojiMap = null) {
        const board = this.render(emojiMap);
        let output = '\n';
        for (let i = 0; i < 9; i += 3) {
            output += ` ${board[i]} | ${board[i+1]} | ${board[i+2]} \n`;
            if (i < 6) output += '---|---|---\n';
        }
        return output;
    }

    reset() {
        this._x = 0;
        this._o = 0;
        this._currentTurn = false;
        this.turns = 0;
        this._history = [];
        this._winningCombination = null;
        this._winningPlayer = null;
        this._gameOver = false;
    }

    static fromHistory(history, playerX = 'x', playerO = 'o') {
        const game = new TicTacToe(playerX, playerO);
        for (const move of history) {
            const result = game.turn(move.player, move.position);
            if (result.status === 'error') {
                throw new Error(`Invalid history at move ${move.turn}: ${result.message}`);
            }
        }
        return game;
    }

    // Advanced methods
    getAvailableMoves() {
        const moves = [];
        const occupied = this.board;
        for (let i = 0; i < 9; i++) {
            if (!(occupied & (1 << i))) {
                moves.push(i);
            }
        }
        return moves;
    }

    clone() {
        const newGame = new TicTacToe(this.playerX, this.playerO);
        newGame._currentTurn = this._currentTurn;
        newGame._x = this._x;
        newGame._o = this._o;
        newGame.turns = this.turns;
        newGame._history = [...this._history];
        newGame._winningCombination = this._winningCombination;
        newGame._winningPlayer = this._winningPlayer;
        newGame._gameOver = this._gameOver;
        return newGame;
    }

    // Serialization
    toJSON() {
        return {
            playerX: this.playerX,
            playerO: this.playerO,
            currentTurn: this._currentTurn,
            x: this._x,
            o: this._o,
            turns: this.turns,
            history: this._history,
            winningCombination: this._winningCombination,
            winningPlayer: this._winningPlayer,
            gameOver: this._gameOver
        };
    }

    static fromJSON(json) {
        const game = new TicTacToe(json.playerX, json.playerO);
        game._currentTurn = json.currentTurn;
        game._x = json.x;
        game._o = json.o;
        game.turns = json.turns;
        game._history = json.history;
        game._winningCombination = json.winningCombination;
        game._winningPlayer = json.winningPlayer;
        game._gameOver = json.gameOver;
        return game;
    }
}

module.exports = TicTacToe;