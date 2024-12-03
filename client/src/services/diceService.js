// src/services/diceService.js
import * as API from '../utils/api';

export const rollDice = async (gameId, currentPlayer, diceValues, selectedDice) => {
  if (!gameId || !currentPlayer) {
    return { success: false, message: 'Game not initialized or no player.' };
  }

  try {
    const result = await API.rollDice(gameId, diceValues, selectedDice);
    return { success: true, dice: result.dice, rollCount: result.rollCount };
  } catch (error) {
    return { success: false, message: `Dice roll failed: ${error.message}` };
  }
};

