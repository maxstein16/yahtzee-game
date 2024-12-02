import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  if (!currentPlayer) return;
  
  try {
    const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
    const newGame = await API.createGame(gameStatus);
    setGameId(newGame.game_id);

    if (mode === 'multiplayer') {
      const gamePlayers = await API.getPlayersInGame(newGame.game_id);
      setPlayers(gamePlayers);
    }

    await API.startGame(newGame.game_id);
    return { success: true, message: `New ${mode} game created!` };
  } catch (error) {
    return { success: false, message: `Failed to create game: ${error.message}` };
  }
};

export const rollDice = async (gameId, currentPlayer, diceValues, selectedDice) => {
  if (!gameId || !currentPlayer) {
    return { success: false, message: 'Game not initialized or no player.' };
  }

  try {
    const result = await API.rollDice(gameId, diceValues, selectedDice);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, message: `Dice roll failed: ${error.message}` };
  }
};

export const submitScore = async (gameId, currentPlayer, category, score) => {
  if (!gameId || !currentPlayer) {
    return { success: false, message: 'Game or player not set.' };
  }

  try {
    await API.submitTurn(gameId, currentPlayer.player_id, category, score);
    return { success: true, message: `${category} score saved!` };
  } catch (error) {
    return { success: false, message: `Turn submission failed: ${error.message}` };
  }
};

export const calculateScores = (dice) => {
  const counts = dice.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});

  const sum = dice.reduce((a, b) => a + b, 0);
  
  return {
    ones: dice.filter(d => d === 1).reduce((a, b) => a + b, 0),
    twos: dice.filter(d => d === 2).reduce((a, b) => a + b, 0),
    threes: dice.filter(d => d === 3).reduce((a, b) => a + b, 0),
    fours: dice.filter(d => d === 4).reduce((a, b) => a + b, 0),
    fives: dice.filter(d => d === 5).reduce((a, b) => a + b, 0),
    sixes: dice.filter(d => d === 6).reduce((a, b) => a + b, 0),
    threeOfAKind: Object.values(counts).some(count => count >= 3) ? sum : 0,
    fourOfAKind: Object.values(counts).some(count => count >= 4) ? sum : 0,
    fullHouse: Object.values(counts).some(count => count === 3) && 
              Object.values(counts).some(count => count === 2) ? 25 : 0,
    smallStraight: [1,2,3,4].every(val => dice.includes(val)) || 
                   [2,3,4,5].every(val => dice.includes(val)) || 
                   [3,4,5,6].every(val => dice.includes(val)) ? 30 : 0,
    largeStraight: [1,2,3,4,5].every(val => dice.includes(val)) || 
                   [2,3,4,5,6].every(val => dice.includes(val)) ? 40 : 0,
    yahtzee: Object.values(counts).some(count => count === 5) ? 50 : 0,
    chance: sum
  };
};