import { message } from 'antd';
import { rollDice, calculateScores } from '../utils/api';

const INITIAL_DICE_VALUES = [1, 1, 1, 1, 1];

export const resetTurnState = ({
    setDiceValues,
    setSelectedDice,
    setRollCount,
    setScores
  }) => {
    setDiceValues(INITIAL_DICE_VALUES);
    setSelectedDice([]);
    setRollCount(0);
    setScores({});
  };
  
  export const toggleDiceSelection = (index, isRolling, isAITurn, setSelectedDice) => {
    if (isRolling || isAITurn) return;
    setSelectedDice(prev =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
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