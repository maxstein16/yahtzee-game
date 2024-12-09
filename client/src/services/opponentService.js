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