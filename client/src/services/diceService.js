// src/services/diceService.js
import * as API from '../utils/api';
import { message } from 'antd';
import { calculateScores } from './scoreTurnService';

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
      setRollCount(result.rollCount);
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