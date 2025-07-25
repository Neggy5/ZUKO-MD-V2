/**
 * Math Duel Game Module
 * A simple competitive math game for two players
 */

const mathDuel = {
  /**
   * Starts a new math duel game
   * @param {Object} players - Player objects { player1, player2 }
   * @returns {Object} Game state and first question
   */
  startGame(players) {
    this.players = players;
    this.scores = {
      [players.player1.id]: 0,
      [players.player2.id]: 0
    };
    this.currentRound = 1;
    
    return {
      gameState: 'STARTED',
      question: this.generateQuestion(),
      scores: this.scores
    };
  },

  /**
   * Generates a random math question
   * @returns {Object} Question and answer
   */
  generateQuestion() {
    const operations = ['+', '-', '*', '/'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    let num1 = Math.floor(Math.random() * 10) + 1;
    let num2 = Math.floor(Math.random() * 10) + 1;

    // Ensure division problems have integer results
    if (op === '/') {
      num1 = num1 * num2;
    }

    const question = `${num1} ${op} ${num2}`;
    const answer = eval(question); // Safe here because we control the input

    return {
      question,
      answer: Math.round(answer * 100) / 100, // Round to 2 decimal places
      round: this.currentRound
    };
  },

  /**
   * Processes a player's answer
   * @param {String} playerId - Answering player's ID
   * @param {Number} answer - Player's answer
   * @returns {Object} Result and next question
   */
  submitAnswer(playerId, answer) {
    const currentQuestion = this.generateQuestion();
    const isCorrect = Math.abs(answer - currentQuestion.answer) < 0.01;

    if (isCorrect) {
      this.scores[playerId] += 1;
    }

    this.currentRound += 1;

    return {
      correct: isCorrect,
      correctAnswer: currentQuestion.answer,
      scores: this.scores,
      nextQuestion: this.generateQuestion(),
      gameOver: this.currentRound > 10 // Ends after 10 rounds
    };
  }
};

module.exports = mathDuel;