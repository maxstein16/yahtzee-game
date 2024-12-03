// src/services/aiOpponentService.js
import * as API from '../utils/api';
import { message } from 'antd';
import { rollDice, calculateScores } from '../services/diceService';
import { submitScore } from '../services/gameStateService';

// Constants
const SCORE_PRIORITIES = {
  yahtzee: 100,
  largeStraight: 80,
  smallStraight: 70,
  fullHouse: 60,
  fourOfAKind: 50,
  threeOfAKind: 40,
  sixes: 35,
  fives: 30,
  fours: 25,
  threes: 20,
  twos: 15,
  ones: 10,
  chance: 5
};

const SCORE_THRESHOLDS = {
  yahtzee: 50,
  largeStraight: 40,
  smallStraight: 30,
  fullHouse: 25,
  fourOfAKind: 24,
  threeOfAKind: 17,
  sixes: 24,
  fives: 20,
  fours: 16,
  threes: 12,
  twos: 8,
  ones: 4,
  chance: 20
};

// Main AI gameplay functions
export const playAITurn = async (gameId, aiPlayer) => {
  let diceValues = [1, 1, 1, 1, 1];
  let bestScore = 0;
  let bestCategory = null;
  let rollCount = 0;

  while (rollCount < 3) {
    const selectedDice = getOptimalDiceToKeep(diceValues);
    const rollResult = await rollDice(gameId, aiPlayer, diceValues, selectedDice);
    
    if (!rollResult.success) {
      throw new Error('AI roll failed: ' + rollResult.message);
    }

    diceValues = rollResult.dice;
    rollCount = rollResult.rollCount;

    const scores = calculateScores(diceValues);
    const { category, score } = findBestScoreOption(scores);
    
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }

    if (isGoodEnoughScore(bestScore, bestCategory)) {
      break;
    }
  }

  return { category: bestCategory, score: bestScore };
};

// AI State Management
export const initializeAIPlayer = async () => {
  const aiCategories = await API.getPlayerCategories('ai-opponent');
  const aiTotal = await API.getPlayerTotalScore('ai-opponent');

  return {
    player: {
      player_id: 'ai-opponent',
      name: 'AI Opponent'
    },
    categories: aiCategories,
    totalScore: aiTotal.totalScore
  };
};

export const handleAITurn = async (gameState) => {
  const {
    gameId,
    aiPlayer,
    setIsAITurn,
    setAiDiceValues,
    setAiRollCount,
    setAiCategories,
    setAiTotal
  } = gameState;

  setIsAITurn(true);
  try {
    const { category, score } = await playAITurn(gameId, aiPlayer);
    const result = await submitScore(gameId, aiPlayer, category, score);
    
    if (result.success) {
      const newCategories = await API.getPlayerCategories('ai-opponent');
      const newTotal = await API.getPlayerTotalScore('ai-opponent');
      
      setAiCategories(newCategories);
      setAiTotal(newTotal.totalScore);
      message.success(`AI played ${category} for ${score} points!`);
    }
  } catch (error) {
    message.error('AI turn failed: ' + error.message);
  } finally {
    setIsAITurn(false);
    setAiDiceValues([1, 1, 1, 1, 1]);
    setAiRollCount(0);
  }
};

// Helper functions
function getOptimalDiceToKeep(diceValues) {
  const valueCounts = diceValues.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

  const potentialCombos = analyzePotentalCombinations(diceValues, valueCounts);
  return selectDiceToKeep(diceValues, potentialCombos);
}

function analyzePotentalCombinations(diceValues, valueCounts) {
  const result = {
    yahtzee: { possible: false, value: null },
    fourOfAKind: { possible: false, value: null },
    threeOfAKind: { possible: false, value: null },
    fullHouse: { possible: false, threeValue: null, pairValue: null },
    straight: { possible: false, values: [] }
  };

  // Check each potential combination
  Object.entries(valueCounts).forEach(([value, count]) => {
    if (count >= 4) {
      result.yahtzee.possible = true;
      result.yahtzee.value = value;
      result.fourOfAKind.possible = true;
      result.fourOfAKind.value = value;
    } else if (count >= 3) {
      result.threeOfAKind.possible = true;
      result.threeOfAKind.value = value;
    }
  });

  // Check Full House
  const threeOfAKind = Object.entries(valueCounts).find(([_, count]) => count >= 3);
  const pair = Object.entries(valueCounts).find(([value, count]) => 
    count >= 2 && value !== (threeOfAKind ? threeOfAKind[0] : null)
  );
  
  if (threeOfAKind && pair) {
    result.fullHouse.possible = true;
    result.fullHouse.threeValue = parseInt(threeOfAKind[0]);
    result.fullHouse.pairValue = parseInt(pair[0]);
  }

  // Check Straight
  checkStraightPotential(diceValues, result);

  return result;
}

function checkStraightPotential(diceValues, result) {
  const uniqueValues = [...new Set(diceValues)].sort((a, b) => a - b);
  if (uniqueValues.length >= 4) {
    for (let i = 0; i < uniqueValues.length - 3; i++) {
      const sequence = uniqueValues.slice(i, i + 4);
      if (sequence[sequence.length - 1] - sequence[0] === sequence.length - 1) {
        result.straight.possible = true;
        result.straight.values = sequence;
        break;
      }
    }
  }
}

function selectDiceToKeep(diceValues, potentialCombos) {
  const diceToKeep = [];

  if (potentialCombos.yahtzee.possible) {
    keepMatchingDice(diceValues, potentialCombos.yahtzee.value, diceToKeep);
  } else if (potentialCombos.fourOfAKind.possible) {
    keepMatchingDice(diceValues, potentialCombos.fourOfAKind.value, diceToKeep);
  } else if (potentialCombos.straight.possible) {
    keepSequentialDice(diceValues, potentialCombos.straight.values, diceToKeep);
  } else if (potentialCombos.fullHouse.possible) {
    keepFullHouseDice(diceValues, potentialCombos.fullHouse, diceToKeep);
  } else if (potentialCombos.threeOfAKind.possible) {
    keepMatchingDice(diceValues, potentialCombos.threeOfAKind.value, diceToKeep);
  } else {
    keepHighValueDice(diceValues, diceToKeep);
  }

  return diceToKeep;
}

function keepFullHouseDice(diceValues, fullHouse, diceToKeep) {
  keepMatchingDice(diceValues, fullHouse.threeValue, diceToKeep);
  keepMatchingDice(diceValues, fullHouse.pairValue, diceToKeep);
}

function keepMatchingDice(diceValues, value, diceToKeep) {
  diceValues.forEach((dice) => {
    if (dice === value) {
      diceToKeep.push(dice);
    }
  });
}

function keepSequentialDice(diceValues, sequence, diceToKeep) {
  sequence.forEach((value) => {
    if (diceValues.includes(value)) {
      diceToKeep.push(value);
    }
  });
}

function keepHighValueDice(diceValues, diceToKeep) {
  const sortedValues = [...diceValues].sort((a, b) => b - a);
  diceToKeep.push(sortedValues[0], sortedValues[1]);
}

function findBestScoreOption(scores) {
  let bestCategory = null;
  let bestWeightedScore = -1;

  Object.entries(scores).forEach(([category, score]) => {
    const priority = SCORE_PRIORITIES[category] || 0;
    const weightedScore = score * priority;
    
    if (weightedScore > bestWeightedScore) {
      bestWeightedScore = weightedScore;
      bestCategory = category;
    }
  });

  return {
    category: bestCategory,
    score: scores[bestCategory] || 0
  };
}

function isGoodEnoughScore(score, category) {
  return score >= (SCORE_THRESHOLDS[category] || 0);
}

const aiOpponentService = {
  playAITurn,
  initializeAIPlayer,
  handleAITurn
};

export default aiOpponentService;