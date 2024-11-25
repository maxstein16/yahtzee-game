/**
 * Calculates scores for the Yahtzee categories based on dice values.
 * @param {number[]} dice - Array of dice values.
 * @returns {Object} - An object with scores for each category.
 */
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
      fullHouse: counts.includes(3) && counts.includes(2) ? 25 : 0,
      smallStraight: isSmallStraight(dice) ? 30 : 0,
      largeStraight: isLargeStraight(dice) ? 40 : 0,
      yahtzee: counts.includes(5) ? 50 : 0,
      chance: dice.reduce((sum, value) => sum + value, 0),
    };
  }
  
  /**
   * Checks if the dice values contain a small straight.
   * @param {number[]} dice - Array of dice values.
   * @returns {boolean} - True if small straight exists.
   */
  function isSmallStraight(dice) {
    const uniqueValues = [...new Set(dice)].sort();
    const straights = [
      [1, 2, 3, 4],
      [2, 3, 4, 5],
      [3, 4, 5, 6],
    ];
    return straights.some((straight) => straight.every((val) => uniqueValues.includes(val)));
  }
  
  /**
   * Checks if the dice values contain a large straight.
   * @param {number[]} dice - Array of dice values.
   * @returns {boolean} - True if large straight exists.
   */
  function isLargeStraight(dice) {
    const uniqueValues = [...new Set(dice)].sort();
    return JSON.stringify(uniqueValues) === JSON.stringify([1, 2, 3, 4, 5]) ||
      JSON.stringify(uniqueValues) === JSON.stringify([2, 3, 4, 5, 6]);
  }
  