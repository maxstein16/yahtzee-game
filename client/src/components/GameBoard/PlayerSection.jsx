import React from 'react';
import { Typography, Button } from 'antd';
import Dice from '../../pages/Dice';

const { Title, Text } = Typography;

const PlayerSection = ({
  currentPlayer,
  playerTotal,
  isMyTurn,
  diceValues,
  selectedDice,
  isRolling,
  rollCount,
  toggleDiceSelection,
  handleDiceRoll,
  gameId,
}) => {
  return (
    <div className="player-section">
      <Title level={4}>
        {currentPlayer?.name || 'Player'} 
        <span className="text-sm ml-2 text-gray-600">
          (Total: {playerTotal || 0})
        </span>
      </Title>
      
      <div className="game-dice-container">
        {diceValues.map((value, index) => (
          <Dice
            key={index}
            value={value}
            isSelected={selectedDice.includes(index)}
            isRolling={isRolling}
            onClick={() => isMyTurn && toggleDiceSelection(index)}
            disabled={!isMyTurn}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4">
        <Button
          type="primary"
          onClick={handleDiceRoll}
          disabled={!gameId || rollCount >= 3 || !isMyTurn}
          className="w-32"
        >
          Roll Dice
        </Button>
        <Text className="text-gray-600">
          Roll Count: {rollCount}/3
        </Text>
      </div>

      {!isMyTurn && (
        <Text className="block text-center mt-2 text-gray-500 italic">
          Waiting for opponent's turn...
        </Text>
      )}
    </div>
  );
};

export default PlayerSection;