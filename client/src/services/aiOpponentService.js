import { rollDice, submitScore, calculateScores } from './lobbyService';

const SCORE_PRIORITIES = {
  'yahtzee': 50,
  'largeStraight': 40,
  'smallStraight': 30,
  'fullHouse': 25,
  'fourOfAKind': 25,
  'threeOfAKind': 20,
  'sixes': 18,
  'fives': 15,
  'fours': 12,
  'threes': 9,
  'twos': 6,
  'ones': 3,
  'chance': 1
};

export const playAITurn = async (gameId, aiPlayer) => {
  let diceValues = [1, 1, 1, 1, 1];
  let bestScore = 0;
  let bestCategory = null;
  let rollCount = 0;

  // AI will try up to 3 rolls to get the best possible score
  while (rollCount < 3) {
    // AI strategy for selecting dice to keep
    const selectedDice = getOptimalDiceToKeep(diceValues);
    
    // Roll the dice
    const rollResult = await rollDice(gameId, aiPlayer, diceValues, selectedDice);
    if (!rollResult.success) {
      throw new Error('AI roll failed: ' + rollResult.message);
    }

    diceValues = rollResult.dice;
    rollCount = rollResult.rollCount;

    // Calculate scores and find the best option
    const scores = calculateScores(diceValues);
    const { category, score } = findBestScoreOption(scores);
    
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }

    // If we got a very good score, stop rolling
    if (isGoodEnoughScore(bestScore, bestCategory)) {
      break;
    }
  }

  // Submit the best score found
  if (bestCategory) {
    return await submitScore(gameId, aiPlayer, bestCategory, bestScore);
  }

  // If no good score was found, take the best available option
  const finalScores = calculateScores(diceValues);
  const { category, score } = findBestScoreOption(finalScores);
  return await submitScore(gameId, aiPlayer, category, score);
};

function getOptimalDiceToKeep(diceValues) {
  // Count occurrences of each value
  const valueCounts = diceValues.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

  // Find dice positions to keep based on strategy
  const diceToKeep = [];
  
  // Keep pairs, three of a kind, etc.
  let maxCount = Math.max(...Object.values(valueCounts));
  if (maxCount >= 2) {
    const valueToKeep = parseInt(Object.keys(valueCounts).find(
      key => valueCounts[key] === maxCount
    ));
    diceValues.forEach((value, index) => {
      if (value === valueToKeep) {
        diceToKeep.push(index);
      }
    });
  }

  // Keep high values if no matches
  if (diceToKeep.length === 0) {
    diceValues.forEach((value, index) => {
      if (value >= 4) {
        diceToKeep.push(index);
      }
    });
  }

  return diceToKeep;
}

function findBestScoreOption(scores) {
  let bestCategory = null;
  let bestScore = -1;

  Object.entries(scores).forEach(([category, score]) => {
    const priority = SCORE_PRIORITIES[category] || 0;
    const weightedScore = score * priority;
    
    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      bestCategory = category;
    }
  });

  return {
    category: bestCategory,
    score: scores[bestCategory] || 0
  };
}

function isGoodEnoughScore(score, category) {
  // Define thresholds for "good enough" scores
  const thresholds = {
    'yahtzee': 50,
    'largeStraight': 40,
    'smallStraight': 30,
    'fullHouse': 25,
    'fourOfAKind': 24,
    'threeOfAKind': 20,
  };

  return score >= (thresholds[category] || 0);
}