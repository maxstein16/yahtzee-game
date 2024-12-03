// lobbyService.js
import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  if (!currentPlayer) return;
  
  try {
    const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
    const newGame = await API.createGame(gameStatus);
    setGameId(newGame.game_id);

    // Reset and initialize categories for current player
    await API.resetPlayerCategories(currentPlayer.player_id);
    await API.initializePlayerCategories(currentPlayer.player_id);

    if (mode === 'multiplayer') {
      const gamePlayers = await API.getPlayersInGame(newGame.game_id);
      setPlayers(gamePlayers);
    } else {
      // Initialize AI player categories
      await API.resetPlayerCategories('ai-opponent');
      await API.initializePlayerCategories('ai-opponent');
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
    return { success: true, dice: result.dice, rollCount: result.rollCount };
  } catch (error) {
    return { success: false, message: `Dice roll failed: ${error.message}` };
  }
};

export const submitScore = async (gameId, currentPlayer, category, score) => {
  if (!gameId || !currentPlayer) {
    return { success: false, message: 'Game or player not set.' };
  }

  try {
    // Get the specific category
    const scoreCategory = await API.getPlayerCategory(
      currentPlayer.player_id, 
      category
    );
    
    if (!scoreCategory) {
      return { success: false, message: 'Invalid category.' };
    }

    // Check if score is already set
    if (scoreCategory.score > 0) {
      return { success: false, message: 'Category already scored.' };
    }

    // Submit score for the category
    const result = await API.submitGameScore(gameId, currentPlayer.player_id, category, score);

    if (!result) {
      throw new Error('Failed to update score');
    }

    return { 
      success: true, 
      message: `${category} score saved!`,
      updatedCategory: result.category
    };
  } catch (error) {
    return { success: false, message: `Turn submission failed: ${error.message}` };
  }
};

export const getPlayerTotalScore = async (playerId) => {
  try {
    const response = await API.getPlayerTotalScore(playerId);
    return response.totalScore;
  } catch (error) {
    console.error('Failed to get total score:', error);
    return 0;
  }
};

export const getAvailableCategories = async (playerId) => {
  try {
    const categories = await API.getPlayerCategories(playerId);
    return categories;
  } catch (error) {
    console.error('Failed to get player categories:', error);
    return [];
  }
};

/**
 * Calculates scores for the Yahtzee categories based on dice values.
 * @param {number[]} dice - Array of dice values.
 * @returns {Object} - An object with scores for each category.
 */
export function calculateScores(dice) {
  const counts = Array(6).fill(0);
  dice.forEach((value) => counts[value - 1]++);

  return {
    ones: counts[0] * 1,
    twos: counts[1] * 2,
    threes: counts[2] * 3,
    fours: counts[3] * 4,
    fives: counts[4] * 5,
    sixes: counts[5] * 6,
    threeOfAKind: hasCount(counts, 3) ? dice.reduce((sum, value) => sum + value, 0) : 0,
    fourOfAKind: hasCount(counts, 4) ? dice.reduce((sum, value) => sum + value, 0) : 0,
    fullHouse: counts.includes(3) && counts.includes(2) ? 25 : 0,
    smallStraight: isSmallStraight(dice) ? 30 : 0,
    largeStraight: isLargeStraight(dice) ? 40 : 0,
    yahtzee: counts.includes(5) ? 50 : 0,
    chance: dice.reduce((sum, value) => sum + value, 0),
  };
}

// Helper functions for score calculation
function hasCount(counts, target) {
  return counts.some(count => count >= target);
}

function isSmallStraight(dice) {
  const uniqueValues = [...new Set(dice)].sort();
  const straights = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
  ];
  return straights.some((straight) => straight.every((val) => uniqueValues.includes(val)));
}

function isLargeStraight(dice) {
  const uniqueValues = [...new Set(dice)].sort();
  return JSON.stringify(uniqueValues) === JSON.stringify([1, 2, 3, 4, 5]) ||
    JSON.stringify(uniqueValues) === JSON.stringify([2, 3, 4, 5, 6]);
}