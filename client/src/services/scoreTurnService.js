import * as API from '../utils/api';
import { message } from 'antd';

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