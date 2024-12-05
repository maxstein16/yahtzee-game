import * as API from '../utils/api';
import { message } from 'antd';

export const submitScore = async (gameId, currentPlayer, categoryName, score, currentDice) => {
  try {
    // Validate inputs
    if (!gameId || !currentPlayer?.player_id || !categoryName) {
      return { 
        success: false, 
        message: 'Missing required parameters.' 
      };
    }

    // Get category information
    const scoreCategory = await API.getPlayerCategory(currentPlayer.player_id, categoryName);
    if (!scoreCategory) {
      return { 
        success: false, 
        message: 'Invalid category.' 
      };
    }

    // Validate and process dice
    let validCurrentDice = [];
    if (currentDice) {
      validCurrentDice = Array.isArray(currentDice) ? currentDice : Array.from(currentDice);
      validCurrentDice = validCurrentDice.map(dice => {
        const num = parseInt(dice, 10);
        return isNaN(num) ? 1 : Math.min(6, Math.max(1, num));
      });
    } else {
      validCurrentDice = [1, 1, 1, 1, 1]; // Default dice values
    }

    // Submit the score first
    const scoreResult = await API.submitGameScore(gameId, currentPlayer.player_id, categoryName, score);
    if (!scoreResult) {
      throw new Error('Failed to update score');
    }

    // Submit the turn using the submitTurn endpoint
    const turnResult = await API.submitTurn(
      gameId,
      currentPlayer.player_id,
      scoreCategory.category_id,
      score,
      validCurrentDice
    );

    // Only roll dice for next turn if the turn submission was successful
    if (turnResult) {
      const keepIndices = validCurrentDice.map((_, i) => i);
      await API.rollDice(gameId, {
        playerId: currentPlayer.player_id,
        currentDice: validCurrentDice,
        keepIndices
      });
    }

    return {
      success: true,
      message: `${categoryName} score saved!`,
      updatedCategory: scoreResult.category,
      turn: turnResult
    };

  } catch (error) {
    console.error('Score submission error:', error);
    return { 
      success: false, 
      message: `Turn submission failed: ${error.message}`,
      error: error 
    };
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

export const getPlayerTotalScore = async (playerId) => {
  try {
    const response = await API.getPlayerTotalScore(playerId);
    return response.totalScore;
  } catch (error) {
    console.error('Failed to get total score:', error);
    return 0;
  }
};

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
      threeOfAKind: counts.some(count => count >= 3) ? dice.reduce((sum, value) => sum + value, 0) : 0,
      fourOfAKind: counts.some(count => count >= 4) ? dice.reduce((sum, value) => sum + value, 0) : 0,
      fullHouse: counts.includes(3) && counts.includes(2) ? 25 : 0,
      smallStraight: isSmallStraight(dice) ? 30 : 0,
      largeStraight: isLargeStraight(dice) ? 40 : 0,
      yahtzee: counts.includes(5) ? 50 : 0,
      chance: dice.reduce((sum, value) => sum + value, 0),
    };
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

  export const resetPlayerCategories = async ({
    currentPlayer,
    gameType,
    setPlayerCategories,
    setPlayerTotal,
    setAiCategories,
    setAiTotal
  }) => {
    try {
      await resetHumanPlayerCategories(currentPlayer, setPlayerCategories, setPlayerTotal);
      
      if (gameType === 'singleplayer') {
        await resetAIPlayerCategories(setAiCategories, setAiTotal);
      }
    } catch (error) {
      message.error('Failed to manage categories: ' + error.message);
    }
  };
  
  const resetHumanPlayerCategories = async (currentPlayer, setPlayerCategories, setPlayerTotal) => {
    const currentCategories = await API.getPlayerCategories(currentPlayer.player_id);
    const hasStartedPlaying = currentCategories.some(category => category.score !== null);
  
    if (hasStartedPlaying) {
      await API.resetPlayerCategories(currentPlayer.player_id);
    } else if (currentCategories.length === 0) {
      await API.initializePlayerCategories(currentPlayer.player_id);
    }
  
    const categories = await API.getPlayerCategories(currentPlayer.player_id);
    setPlayerCategories(categories);
    setPlayerTotal(0);
  };
  
  const resetAIPlayerCategories = async (setAiCategories, setAiTotal) => {
    const currentAICategories = await API.getPlayerCategories('ai-opponent');
    const aiHasStartedPlaying = currentAICategories.some(category => category.score !== null);
  
    if (aiHasStartedPlaying) {
      await API.resetPlayerCategories('ai-opponent');
    } else if (currentAICategories.length === 0) {
      await API.initializePlayerCategories('ai-opponent');
    }
  
    const aiCategories = await API.getPlayerCategories('ai-opponent');
    setAiCategories(aiCategories);
    setAiTotal(0);
  };