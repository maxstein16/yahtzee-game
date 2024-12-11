import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import Game from './Game'; // Your existing Game component
import API from '../utils/api';
import { fetchCurrentPlayer } from '../services/authService';

const GameWrapper = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeGame = async () => {
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
          message.error('Game not found');
          navigate('/lobby');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing game:', error);
        message.error('Failed to initialize game');
        navigate('/lobby');
      }
    };

    initializeGame();
  }, [gameId, navigate]);

  if (isLoading) {
    return <div>Loading game...</div>;
  }

  return <Game gameId={gameId} currentPlayer={currentPlayer} />;
};

export default GameWrapper;