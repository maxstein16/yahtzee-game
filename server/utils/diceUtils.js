// utils/diceUtils.js

/**
 * Rolls a specified number of dice and returns the results.
 * @param {number} numDice - Number of dice to roll.
 * @returns {number[]} Array of dice results.
 */
function rollDice(numDice = 5) {
  const dice = [];
  for (let i = 0; i < numDice; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1); // Random number between 1 and 6
  }
  return dice;
}

/**
 * Rerolls specific dice based on indices.
 * @param {number[]} currentDice - The current dice results.
 * @param {number[]} keepIndices - Indices of dice to keep.
 * @returns {number[]} Array with updated dice results.
 */
function rerollDice(currentDice, keepIndices) {
  const newDice = currentDice.map((value, index) => {
    return keepIndices.includes(index) ? value : Math.floor(Math.random() * 6) + 1;
  });
  return newDice;
}

/**
 * Manages a turn for a player, allowing up to 3 rolls.
 * @param {number} currentRollCount - Current roll count (starts at 1).
 * @param {number[]} currentDice - Current dice results.
 * @param {number[]} [keepIndices=[]] - Indices of dice to keep on reroll (optional).
 * @returns {Object} Updated roll result and roll count.
 */
function playTurn(currentRollCount, currentDice = [], keepIndices = []) {
  if (currentRollCount === 1) {
    // Initial roll with all dice
    return { dice: rollDice(5), rollCount: 1 };
  } else if (currentRollCount === 2 || currentRollCount === 3) {
    // Reroll specific dice
    const newDice = rerollDice(currentDice, keepIndices);
    return { dice: newDice, rollCount: currentRollCount };
  } else {
    // Max rolls reached
    throw new Error("Maximum rolls (3) reached for this turn.");
  }
}

module.exports = {
  rollDice,
  rerollDice,
  playTurn,
};
