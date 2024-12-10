import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Layout } from 'antd';
import SinglePlayer from '../components/SinglePlayer/SinglePlayer';
import GameHeader from '../components/GameHeader/GameHeader';
import { handleLogout, fetchCurrentPlayer } from '../services/authService';
import API from '../utils/api';

function SinglePlayerPage() {
  const navigate = useNavigate();
  
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize player and check for active game
  useEffect(() => {
    const initializeGame = async () => {
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);

          // Check for active game
          const activeGame = await API.getActiveGameForPlayer(playerInfo.playerData.player_id);
          if (activeGame) {
            setGameId(activeGame.game_id);
          }
        }
      } catch (error) {
        console.error('Error initializing game:', error);
        message.error('Failed to initialize game');
      } finally {
        setIsLoading(false);
      }
    };

    initializeGame();
  }, [navigate]);

  const handleNewGame = async () => {
    try {
      setIsLoading(true);
      
      // End current game if exists
      if (gameId) {
        await API.endGame(gameId);
      }

      // Reset player categories
      await API.resetPlayerCategories(currentPlayer.player_id);
      await API.resetPlayerCategories('ai'); // Reset AI categories

      // Create new game
      const newGame = await API.createGame('pending', 0, currentPlayer.player_id);
      setGameId(newGame.game.game_id);

      // Initialize categories for both players
      await API.initializePlayerCategories(currentPlayer.player_id);
      await API.initializePlayerCategories('ai');
      
      // Start game
      await API.startGame(newGame.game.game_id);

      message.success('New game started!');
    } catch (error) {
      console.error('Error creating new game:', error);
      message.error('Failed to start new game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameEnd = async () => {
    try {
      if (gameId) {
        await API.endGame(gameId);
      }
      navigate('/lobby');
    } catch (error) {
      console.error('Error ending game:', error);
      message.error('Failed to end game');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Layout className="min-h-screen">
      <GameHeader
        currentPlayer={currentPlayer}
        handleNewGame={handleNewGame}
        handleLogout={() => handleLogout(navigate)}
      />
      <SinglePlayer
        currentPlayer={currentPlayer}
        gameId={gameId}
        onGameEnd={handleGameEnd}
      />
    </Layout>
  );
}

export default SinglePlayerPage;