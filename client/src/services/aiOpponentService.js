import { rollDice, submitScore, calculateScores } from './lobbyService';

// Score priorities and weights for different combinations
const SCORE_PRIORITIES = {
  yahtzee: 100,        // Highest priority
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
  chance: 5           // Lowest priority
};

// Threshold values for "good enough" scores to stop rolling
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

export const playAITurn = async (gameId, aiPlayer) => {
  let diceValues = [1, 1, 1, 1, 1];
  let bestScore = 0;
  let bestCategory = null;
  let rollCount = 0;

  // AI will make up to 3 rolls
  while (rollCount < 3) {
    // Determine which dice to keep based on current values
    const selectedDice = getOptimalDiceToKeep(diceValues);
    
    // Perform the roll
    const rollResult = await rollDice(gameId, aiPlayer, diceValues, selectedDice);
    if (!rollResult.success) {
      throw new Error('AI roll failed: ' + rollResult.message);
    }

    diceValues = rollResult.dice;
    rollCount = rollResult.rollCount;

    // Calculate scores and find best option
    const scores = calculateScores(diceValues);
    const { category, score } = findBestScoreOption(scores);
    
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }

    // Check if current score is good enough to stop rolling
    if (isGoodEnoughScore(bestScore, bestCategory)) {
      break;
    }
  }

  // Submit the best score found
  return await submitScore(gameId, aiPlayer, bestCategory, bestScore);
};

function getOptimalDiceToKeep(diceValues) {
  // Count occurrences of each value
  const valueCounts = diceValues.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

  // Check for potential scoring combinations
  const potentialCombos = analyzePotentalCombinations(diceValues, valueCounts);
  
  // Select dice to keep based on the best potential combination
  const diceToKeep = [];
  
  if (potentialCombos.yahtzee.possible) {
    // Keep all matching dice for potential Yahtzee
    const valueToKeep = parseInt(potentialCombos.yahtzee.value);
    diceValues.forEach((value, index) => {
      if (value === valueToKeep) {
        diceToKeep.push(index);
      }
    });
  } else if (potentialCombos.fourOfAKind.possible) {
    // Keep matching dice for potential 4 of a kind
    const valueToKeep = parseInt(potentialCombos.fourOfAKind.value);
    diceValues.forEach((value, index) => {
      if (value === valueToKeep) {
        diceToKeep.push(index);
      }
    });
  } else if (potentialCombos.straight.possible) {
    // Keep sequential dice for potential straight
    const sequentialValues = potentialCombos.straight.values;
    diceValues.forEach((value, index) => {
      if (sequentialValues.includes(value)) {
        diceToKeep.push(index);
      }
    });
  } else if (potentialCombos.fullHouse.possible) {
    // Keep dice for potential full house
    const { threeValue, pairValue } = potentialCombos.fullHouse;
    diceValues.forEach((value, index) => {
      if (value === threeValue || value === pairValue) {
        diceToKeep.push(index);
      }
    });
  } else if (potentialCombos.threeOfAKind.possible) {
    // Keep matching dice for potential 3 of a kind
    const valueToKeep = parseInt(potentialCombos.threeOfAKind.value);
    diceValues.forEach((value, index) => {
      if (value === valueToKeep) {
        diceToKeep.push(index);
      }
    });
  } else {
    // Keep high value dice if no clear combination
    diceValues.forEach((value, index) => {
      if (value >= 4) {
        diceToKeep.push(index);
      }
    });
  }

  return diceToKeep;
}

function analyzePotentalCombinations(diceValues, valueCounts) {
  const result = {
    yahtzee: { possible: false, value: null },
    fourOfAKind: { possible: false, value: null },
    threeOfAKind: { possible: false, value: null },
    fullHouse: { possible: false, threeValue: null, pairValue: null },
    straight: { possible: false, values: [] }
  };

  // Check for potential Yahtzee
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

  // Check for potential Full House
  const threeOfAKind = Object.entries(valueCounts).find(([_, count]) => count >= 3);
  const pair = Object.entries(valueCounts).find(([value, count]) => 
    count >= 2 && value !== (threeOfAKind ? threeOfAKind[0] : null)
  );
  
  if (threeOfAKind && pair) {
    result.fullHouse.possible = true;
    result.fullHouse.threeValue = parseInt(threeOfAKind[0]);
    result.fullHouse.pairValue = parseInt(pair[0]);
  }

  // Check for potential Straight
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

  return result;
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

export default playAITurn;