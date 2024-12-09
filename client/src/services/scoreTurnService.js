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
  const counts = new Array(7).fill(0);
  const sum = dice.reduce((total, value) => {
    counts[value]++;
    return total + value;
  }, 0);

  const scores = {};

  // Upper section scoring (ones through sixes)
  for (let i = 1; i <= 6; i++) {
    scores[`${i}s`.toLowerCase()] = counts[i] * i;
  }

  // Three of a kind
  scores.threeOfAKind = counts.some(count => count >= 3) ? sum : 0;

  // Four of a kind
  scores.fourOfAKind = counts.some(count => count >= 4) ? sum : 0;

  // Full house
  scores.fullHouse = (counts.includes(2) && counts.includes(3)) ? 25 : 0;

  // Small straight
  scores.smallStraight = hasSmallStraight(counts) ? 30 : 0;

  // Large straight
  scores.largeStraight = hasLargeStraight(counts) ? 40 : 0;

  // Yahtzee
  scores.yahtzee = counts.some(count => count === 5) ? 50 : 0;

  // Chance
  scores.chance = sum;

  return scores;
}

function hasSmallStraight(counts) {
  return (counts[1] >= 1 && counts[2] >= 1 && counts[3] >= 1 && counts[4] >= 1) ||
         (counts[2] >= 1 && counts[3] >= 1 && counts[4] >= 1 && counts[5] >= 1) ||
         (counts[3] >= 1 && counts[4] >= 1 && counts[5] >= 1 && counts[6] >= 1);
}

function hasLargeStraight(counts) {
  return (counts[1] >= 1 && counts[2] >= 1 && counts[3] >= 1 && counts[4] >= 1 && counts[5] >= 1) ||
         (counts[2] >= 1 && counts[3] >= 1 && counts[4] >= 1 && counts[5] >= 1 && counts[6] >= 1);
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