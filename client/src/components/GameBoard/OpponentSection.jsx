import React from 'react';
import { Typography } from 'antd';
import Dice from '../Dice';

const { Title, Text } = Typography;

const OpponentSection = ({ aiTotal, isAITurn, aiDiceValues, isRolling, aiRollCount }) => {
  return (
    <div className="opponent-section">
      <Title level={4}>Opponent (Total: {aiTotal})</Title>
      {isAITurn && (
        <>
          <div className="game-dice-container">
            {aiDiceValues.map((value, index) => (
              <Dice
                key={index}
                value={value}
                isRolling={isRolling}
                disabled={true}
              />
            ))}
          </div>
          <Text>Roll Count: {aiRollCount}/3</Text>
        </>
      )}
    </div>
  );
};

export default OpponentSection;