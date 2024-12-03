import React from 'react';
import OpponentSection from './OpponentSection';
import PlayerSection from './PlayerSection';

const GameBoard = (props) => {
  return (
    <div className="game-board">
      <OpponentSection {...props} />
      <PlayerSection {...props} />
    </div>
  );
};

export default GameBoard;