export const calculateOptimalMove = (diceValues, availableCategories) => {
  const allPossibleCombos = generatePossibleCombinations(diceValues);
  let bestScore = -1;
  let bestCategory = null;
  let bestKeepIndices = [];

  availableCategories.forEach(category => {
    allPossibleCombos.forEach(combo => {
      const score = calculatePotentialScore(combo.dice, category.name);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
        bestKeepIndices = combo.keepIndices;
      }
    });
  });

  return {
    category: bestCategory,
    keepIndices: bestKeepIndices,
    expectedScore: bestScore
  };
};

const generatePossibleCombinations = (diceValues) => {
  const combinations = [];
  // Generate all possible keep/reroll combinations
  for (let i = 0; i < Math.pow(2, 5); i++) {
    const keepIndices = [];
    const dice = [...diceValues];
    
    for (let j = 0; j < 5; j++) {
      if ((i & (1 << j)) !== 0) {
        keepIndices.push(j);
      }
    }
    
    // Simulate potential rolls for non-kept dice
    const nonKeptIndices = Array.from({length: 5}, (_, i) => i)
      .filter(i => !keepIndices.includes(i));
    
    for (let roll = 1; roll <= 6; roll++) {
      const simDice = [...dice];
      nonKeptIndices.forEach(i => {
        simDice[i] = roll;
      });
      combinations.push({
        dice: simDice,
        keepIndices
      });
    }
  }
  return combinations;
};

const calculatePotentialScore = (dice, categoryName) => {
  const counts = new Array(7).fill(0);
  dice.forEach(value => counts[value]++);

  switch (categoryName) {
    case 'ones':
      return counts[1];
    case 'twos':
      return counts[2] * 2;
    case 'threes':
      return counts[3] * 3;
    case 'fours':
      return counts[4] * 4;
    case 'fives':
      return counts[5] * 5;
    case 'sixes':
      return counts[6] * 6;
    case 'threeOfAKind':
      return counts.some(c => c >= 3) ? dice.reduce((sum, val) => sum + val, 0) : 0;
    case 'fourOfAKind':
      return counts.some(c => c >= 4) ? dice.reduce((sum, val) => sum + val, 0) : 0;
    case 'fullHouse':
      return counts.some(c => c === 3) && counts.some(c => c === 2) ? 25 : 0;
    case 'smallStraight':
      return hasSmallStraight(counts) ? 30 : 0;
    case 'largeStraight':
      return hasLargeStraight(counts) ? 40 : 0;
    case 'yahtzee':
      return counts.some(c => c === 5) ? 50 : 0;
    case 'chance':
      return dice.reduce((sum, val) => sum + val, 0);
    default:
      return 0;
  }
};

const hasSmallStraight = (counts) => {
  return (counts[1] && counts[2] && counts[3] && counts[4]) ||
         (counts[2] && counts[3] && counts[4] && counts[5]) ||
         (counts[3] && counts[4] && counts[5] && counts[6]);
};

const hasLargeStraight = (counts) => {
  return (counts[1] && counts[2] && counts[3] && counts[4] && counts[5]) ||
         (counts[2] && counts[3] && counts[4] && counts[5] && counts[6]);
};

export const executeOpponentTurn = async (gameId, opponentId, categories, initialDice, API) => {
  const rollHistory = [];
  let currentDice = [...initialDice];
  let rollCount = 0;
  
  // Simulate 2-3 rolls
  const numRolls = Math.floor(Math.random() * 2) + 2;
  
  for (let i = 0; i < numRolls && rollCount < 3; i++) {
    // Simulate dice roll
    currentDice = currentDice.map(() => Math.floor(Math.random() * 6) + 1);
    rollHistory.push([...currentDice]);
    rollCount++;
    
    // Add delay between rolls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Select best scoring category
  const scores = calculateScores(currentDice);
  const availableCategories = categories.filter(cat => !cat.is_submitted);
  
  let bestCategory = availableCategories[0];
  let bestScore = scores[bestCategory.name] || 0;
  
  availableCategories.forEach(category => {
    const score = scores[category.name] || 0;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });

  // Submit the score
  await API.submitGameScore(gameId, opponentId, bestCategory.name, bestScore);

  return {
    finalDice: currentDice,
    rollCount,
    score: bestScore,
    selectedCategory: bestCategory,
    rollHistory
  };
};

const getThresholdForCategory = (categoryName) => {
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