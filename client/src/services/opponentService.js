import { calculateScores } from '../services/scoreTurnService';

export const getThresholdForCategory = (categoryName) => {
  const thresholds = {
    ones: 3,
    twos: 6,
    threes: 9,
    fours: 12,
    fives: 15,
    sixes: 18,
    threeOfAKind: 20,
    fourOfAKind: 25,
    fullHouse: 25,
    smallStraight: 30,
    largeStraight: 40,
    yahtzee: 50,
    chance: 20
  };
  return thresholds[categoryName] || 0;
};

export const calculateOptimalMove = (diceValues, availableCategories, calculateScores) => {
  const currentScores = calculateScores(diceValues);
  
  let bestScore = -1;
  let bestCategory = null;
  let bestKeepIndices = [];

  availableCategories.forEach(category => {
    const score = currentScores[category.name] || 0;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });

  // Determine which dice to keep
  if (bestCategory) {
    const counts = new Array(7).fill(0);
    diceValues.forEach((value, index) => {
      counts[value]++;
      // Keep dice that contribute to the best score
      if ((bestCategory.name === `${value}s`) || 
          (counts[value] >= 3 && bestCategory.name === 'threeOfAKind') ||
          (counts[value] >= 4 && bestCategory.name === 'fourOfAKind') ||
          (counts[value] === 5 && bestCategory.name === 'yahtzee') ||
          (bestCategory.name === 'fullHouse' && (counts[value] >= 3 || counts[value] === 2))) {
        bestKeepIndices.push(index);
      }
    });

    // Special handling for straights
    if (bestCategory.name === 'smallStraight' || bestCategory.name === 'largeStraight') {
      const sequence = [];
      counts.forEach((count, value) => {
        if (count > 0) sequence.push(value);
      });
      diceValues.forEach((value, index) => {
        if (sequence.length >= 3 && sequence.includes(value)) {
          bestKeepIndices.push(index);
        }
      });
    }
  }

  return {
    category: bestCategory,
    expectedScore: bestScore,
    keepIndices: [...new Set(bestKeepIndices)] // Remove duplicates
  };
};

export const getOptimalCategory = (diceValues, availableCategories) => {
  const scores = calculateScores(diceValues);
  let bestScore = -1;
  let bestCategory = null;

  availableCategories.forEach(category => {
    const score = scores[category.name] || 0;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });

  return {
    category: bestCategory,
    score: bestScore
  };
};