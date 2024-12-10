import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Layout } from 'antd';
import Multiplayer from '../components/Multiplayer/Multiplayer';
import GameHeader from '../components/GameHeader/GameHeader';
import { handleLogout, fetchCurrentPlayer } from '../services/authService';
import { initializeWebSocket } from '../services/websocketService';
import API from '../utils/api';

function MultiplayerPage() {
  const navigate = useNavigate();
  
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [opponent, setOpponent] = useState(null);
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
            
            // Get opponent info if in active game
            const players = await API.getPlayersInGame(activeGame.game_id);
            const opponentData = players.find(p => p.player_id !== playerInfo.playerData.player_id);
            if (opponentData) {
              setOpponent(opponentData);
            }
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

  // Initialize WebSocket
  useEffect(() => {
    if (!currentPlayer?.player_id) return;

    const connectSocket = async () => {
      try {
        const socketConnection = await initializeWebSocket(currentPlayer.player_id);
        setSocket(socketConnection);
        
        socketConnection.on('gameStart', async ({ gameId, opponentId }) => {
          setGameId(gameId);
          try {
            const opponentData = await API.getPlayerById(opponentId);
            setOpponent(opponentData);
          } catch (error) {
            console.error('Error fetching opponent:', error);
          }
        });

        socketConnection.on('gameEnd', () => {
          message.info('Game ended');
          navigate('/lobby');
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        message.error('Failed to connect to game server');
      }
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentPlayer, navigate]);

  const handleNewGame = async () => {
    try {
      setIsLoading(true);
      
      // End current game if exists
      if (gameId) {
        await API.endGame(gameId);
      }

      // Create new game
      const newGame = await API.createGame('pending', 0, currentPlayer.player_id);
      setGameId(newGame.game.game_id);

      // Initialize categories
      await API.initializePlayerCategories(currentPlayer.player_id);
      
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
      <Multiplayer
        currentPlayer={currentPlayer}
        gameId={gameId}
        socket={socket}
        opponent={opponent}
        onGameEnd={() => navigate('/lobby')}
      />
    </Layout>
  );
}

export default MultiplayerPage;