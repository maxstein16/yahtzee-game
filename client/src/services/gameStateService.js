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
