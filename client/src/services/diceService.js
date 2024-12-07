// src/services/diceService.js
import * as API from '../utils/api';
import { message } from 'antd';
import { calculateScores } from './scoreTurnService';

export const rollDice = async (gameId, currentPlayer, diceValues, selectedDice) => {
  if (!gameId || !currentPlayer) {
    return { success: false, message: 'Game not initialized or no player.' };
  }

  try {
    const keepIndices = selectedDice; // Indices of dice to keep
    
    const result = await API.rollDice(gameId, {
      playerId: currentPlayer.player_id,
      currentDice: diceValues,
      keepIndices
    });
    
    // If we have dice values in the result, use them, otherwise keep current values
    const newDiceValues = result.dice.map((value, index) => {
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
  if (rollCount >= 3) {
    message.warning('Maximum rolls reached for this turn.');
    return;
  }

  setIsRolling(true);
  try {
    const result = await rollDice(gameId, currentPlayer, diceValues, selectedDice);
    if (result.success) {
      setDiceValues(result.dice);
      // Calculate and set scores with the new dice values
      const newScores = calculateScores(result.dice);
      setScores(newScores); // Make sure this is getting set
      const newRollCount = rollCount + 1;
      setRollCount(newRollCount);
      
      // Debug log to verify scores are being calculated
      console.log('New dice values:', result.dice);
      console.log('Calculated scores:', newScores);
    } else {
      message.error(result.message);
    }
  } catch (error) {
    console.error('Roll dice error:', error);
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