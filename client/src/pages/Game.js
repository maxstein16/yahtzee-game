import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Game({ match }) {
  const { id } = match.params;
  const [gameState, setGameState] = useState({});
  const [playerTurn, setPlayerTurn] = useState('');

  useEffect(() => {
    // Fetch game state
    axios.get(`/game/${id}`).then((res) => setGameState(res.data));
  }, [id]);

  return (
    <div>
      <h1>Game {id}</h1>
      <h2>Turn: {playerTurn}</h2>
      {/* Render SVG Game Board */}
    </div>
  );
}

export default Game;
