import * as API from '../utils/api';
import { message } from 'antd';

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
  setPlayerCategories,
  setPlayerTotal
}) => {
  if (!currentPlayer?.player_id) {
    throw new Error('Invalid player data');
  }

  try {
    const currentCategories = await API.getPlayerCategories(currentPlayer.player_id);
    
    // Reset player categories
    if (currentCategories && currentCategories.length > 0) {
      await API.resetPlayerCategories(currentPlayer.player_id);
    }
    
    // Initialize categories if needed
    const categories = await API.getPlayerCategories(currentPlayer.player_id);
    if (!categories || categories.length === 0) {
      await API.initializePlayerCategories(currentPlayer.player_id);
    }
    
    // Get fresh categories
    const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
    setPlayerCategories(updatedCategories);
    setPlayerTotal(0);
  } catch (error) {
    console.error('Error resetting categories:', error);
    message.error('Failed to reset categories: ' + error.message);
  }
};