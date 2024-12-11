import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import Game from './Game';
import API from '../../utils/api';
import { fetchCurrentPlayer } from '../../services/authService';

const GameWrapper = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [opponent, setOpponent] = useState(null);

  useEffect(() => {
    const initializeGame = async () => {
      if (!gameId) {
        message.error('No game ID provided');
        navigate('/lobby');
        return;
      }

      try {
        // Get current player info
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (!playerInfo) {
          throw new Error('Failed to fetch player information');
        }
        setCurrentPlayer(playerInfo.playerData);

        // Verify game exists and player is part of it
        const game = await API.getGameById(gameId);
        if (!game) {
          throw new Error('Game not found');
        }

        // Get players in game
        const players = await API.getPlayersInGame(gameId);
        const opponentPlayer = players.find(p => p.player_id !== playerInfo.playerData.player_id);
        setOpponent(opponentPlayer);

        // Initialize player categories if needed
        await API.initializePlayerCategories(playerInfo.playerData.player_id);

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing game:', error);
        message.error(error.message || 'Failed to initialize game');
        navigate('/lobby');
      }
    };

    initializeGame();
  }, [gameId, navigate]);

  if (isLoading) {
    return <div>Loading game...</div>;
  }

  return (
    <Game 
      gameId={gameId} 
      currentPlayer={currentPlayer}
      opponent={opponent}
    />
  );
};

export default GameWrapper;