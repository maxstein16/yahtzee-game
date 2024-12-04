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