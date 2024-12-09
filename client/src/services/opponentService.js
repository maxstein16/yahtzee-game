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

// In your Lobby.js useEffect for opponent turns
const executeOpponentTurn = async () => {
  if (opponentState.isOpponentTurn && gameId) {
    try {
      // Initial roll
      let currentDice = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
      
      // Update state and show message for first roll
      setOpponentState(prev => ({
        ...prev,
        dice: currentDice,
        rollCount: 1
      }));
      
      message.info(`Opponent Roll 1: ${currentDice.join(', ')}`, 1);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Determine optimal move based on first roll
      const availableCategories = opponentState.categories.filter(cat => !cat.is_submitted);
      let bestMove = calculateOptimalMove(currentDice, availableCategories);
      
      // Do 1-2 more rolls if beneficial
      for (let roll = 2; roll <= 3; roll++) {
        if (bestMove.expectedScore < getThresholdForCategory(bestMove.category.name)) {
          // Roll non-kept dice
          const newDice = [...currentDice];
          for (let i = 0; i < 5; i++) {
            if (!bestMove.keepIndices.includes(i)) {
              newDice[i] = Math.floor(Math.random() * 6) + 1;
            }
          }
          currentDice = newDice;
          
          // Update state and show message
          setOpponentState(prev => ({
            ...prev,
            dice: currentDice,
            rollCount: roll
          }));
          
          message.info(`Opponent Roll ${roll}: ${currentDice.join(', ')}`, 1);
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Recalculate best move
          bestMove = calculateOptimalMove(currentDice, availableCategories);
        } else {
          break; // Stop rolling if we have a good score
        }
      }

      // Ensure we have valid data before submission
      if (!bestMove.category?.name || bestMove.expectedScore === undefined) {
        throw new Error('Invalid category or score data');
      }

      // Submit score
      try {
        await API.submitGameScore(
          gameId,
          '9', // opponent ID
          bestMove.category.name,
          bestMove.expectedScore
        );

        // Update opponent state only after successful submission
        const updatedCategories = await API.getPlayerCategories('9');
        setOpponentState(prev => ({
          ...prev,
          categories: updatedCategories,
          lastCategory: bestMove.category.name,
          turnScore: bestMove.expectedScore,
          score: prev.score + bestMove.expectedScore,
          isOpponentTurn: false,
          rollCount: 0,
          dice: INITIAL_DICE_VALUES
        }));

        message.success(
          `Opponent chose ${bestMove.category.name} for ${bestMove.expectedScore} points!`, 
          2.5
        );
      } catch (submitError) {
        console.error('Error submitting opponent score:', submitError);
        message.error('Failed to submit opponent score');
        resetOpponentTurn();
      }
    } catch (error) {
      console.error('Error during opponent turn:', error);
      message.error('Opponent turn failed');
      resetOpponentTurn();
    }
  }
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

export const calculateOptimalMove = (diceValues, availableCategories) => {
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
    diceValues.forEach((value, index) => counts[value]++);
    
    diceValues.forEach((value, index) => {
      switch(bestCategory.name) {
        case 'fourOfAKind':
          if (counts[value] >= 4) bestKeepIndices.push(index);
          break;
        case 'threeOfAKind':
          if (counts[value] >= 3) bestKeepIndices.push(index);
          break;
        case 'fullHouse':
          const hasThree = counts.findIndex(count => count >= 3);
          const hasTwo = counts.findIndex((count, i) => count >= 2 && i !== hasThree);
          if (value === hasThree || value === hasTwo) bestKeepIndices.push(index);
          break;
        case 'yahtzee':
          const mostCommon = counts.indexOf(Math.max(...counts));
          if (value === mostCommon) bestKeepIndices.push(index);
          break;
        default:
          if (bestCategory.name === `${value}s`) bestKeepIndices.push(index);
          break;
      }
    });
  }

  return {
    category: bestCategory,
    expectedScore: bestScore,
    keepIndices: [...new Set(bestKeepIndices)]
  };
};