import React from 'react';
import { Typography, Button } from 'antd';
import Dice from '../../pages/Dice';

const { Title, Text } = Typography;

const PlayerSection = ({
  currentPlayer,
  playerTotal,
  isAITurn,
  diceValues,
  selectedDice,
  isRolling,
  rollCount,
  toggleDiceSelection,
  handleRollDice,
  gameId
}) => {
  return (
    <div className="player-section">
      <Title level={4}>{currentPlayer?.name || 'Player'} (Total: {playerTotal})</Title>
      <div className="game-dice-container">
        {!isAITurn && diceValues.map((value, index) => (
          <Dice
            key={index}
            value={value}
            isSelected={selectedDice.includes(index)}
            isRolling={isRolling}
            onClick={() => toggleDiceSelection(index)}
            disabled={isAITurn || rollCount >= 3}
          />
        ))}
      </div>
      <div className="roll-button-container">
        <Button
          type="primary"
          onClick={handleRollDice}
          disabled={!gameId || rollCount >= 3 || isAITurn}
        >
          Roll Dice
        </Button>
        <Text className="roll-count">Roll Count: {rollCount}/3</Text>
      </div>
    </div>
  );
};

export default PlayerSection;