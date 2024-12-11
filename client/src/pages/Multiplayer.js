import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import GameBoard from '../components/GameBoard/GameBoard';
import Scoreboard from '../components/ScoreBoard/ScoreBoard';

const MultiplayerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = location.state || {};

  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [playerCategories, setPlayerCategories] = useState([]);
  const [opponentCategories, setOpponentCategories] = useState([]);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    const initializeGame = async () => {
      try {
        const playerInfo = await API.getCurrentPlayer();
        setCurrentPlayer(playerInfo);

        const categories = await API.getPlayerCategories(playerInfo.id);
        setPlayerCategories(categories);

        const opponentCats = await API.getOpponentCategories(gameId);
        setOpponentCategories(opponentCats);

        const state = await API.getGameState(gameId);
        setGameState(state);

        // Poll for updates every 30 seconds
        const interval = setInterval(async () => {
          const updatedState = await API.getGameState(gameId);
          setGameState(updatedState);
        }, 30000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Error initializing game:', error);
        message.error('Failed to initialize game');
        navigate('/lobby');
      }
    };

    if (gameId) {
      initializeGame();
    }
  }, [gameId, navigate]);

  return (
    <Layout>
      <Layout.Content>
        <GameBoard gameState={gameState} />
        <Scoreboard categories={playerCategories} />
        <Scoreboard categories={opponentCategories} isOpponent />
      </Layout.Content>
    </Layout>
  );
};

export default MultiplayerPage;