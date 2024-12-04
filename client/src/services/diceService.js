// src/services/diceService.js
import * as API from '../utils/api';
import { message } from 'antd';
import { calculateScores } from './scoreTurnService';

export const rollDice = async (gameId, currentPlayer, diceValues, selectedDice) => {
  if (!gameId || !currentPlayer) {
    return { success: false, message: 'Game not initialized or no player.' };
  }

  try {
    // Create an array marking which dice should be rerolled (not selected)
    const diceToReroll = diceValues.map((_, index) => !selectedDice.includes(index));
    
    // Pass both current values and reroll instructions to API
    const result = await API.rollDice(gameId, diceValues, diceToReroll);
    
    // If result.dice is returned, use it; otherwise, create new dice array
    const newDiceValues = result.dice.map((value, index) => {
      // Keep selected dice, only update non-selected ones
      return selectedDice.includes(index) ? diceValues[index] : value;
    });

    return { 
      success: true, 
      dice: newDiceValues,
      rollCount: result.rollCount 
    };
  } catch (error) {
    return { success: false, message: `Dice roll failed: ${error.message}` };
  }
};

export const handleRollDice = async ({
  rollCount,
  gameId,
  currentPlayer,
  diceValues,
  selectedDice,
  setIsRolling,
  setDiceValues,
  setScores,
  setRollCount
}) => {
  // Prevent rolling if already at max rolls
  if (rollCount >= 3) {
    message.warning('Maximum rolls reached for this turn.');
    return;
  }

  setIsRolling(true);
  try {
    const result = await rollDice(gameId, currentPlayer, diceValues, selectedDice);
    if (result.success) {
      setDiceValues(result.dice);
      setScores(calculateScores(result.dice));
      const newRollCount = rollCount + 1;
      setRollCount(newRollCount);
    } else {
      message.error(result.message);
    }
  } catch (error) {
    message.error('Failed to roll dice');
  } finally {
    setIsRolling(false);
  }
};

export const toggleDiceSelection = (index, isRolling, isAITurn, setSelectedDice) => {
  if (isRolling || isAITurn) return;
  setSelectedDice(prev =>
    prev.includes(index)
      ? prev.filter((i) => i !== index)
      : [...prev, index]
  );
};