// src/pages/Lobby/Lobby.js
import React, { useState, useEffect } from 'react';
import { message, Layout } from 'antd';
import { useNavigate } from 'react-router-dom';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import initializeWebSocket from '../../services/websocketService';
import LobbyChat from './LobbyChat';
import GameHeader from '../../components/GameHeader/GameHeader';
import API from '../../utils/api';

function Lobby() {
  const navigate = useNavigate();

  // Basic state
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Socket state
  const [socket, setSocket] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);

  // Initialize player
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);
        }
      } catch (error) {
        console.error('Error initializing player:', error);
        message.error('Failed to initialize player data');
      } finally {
        setIsLoading(false);
      }
    };

    initializePlayer();
  }, [navigate]);

  // Handle new game creation
  const handleNewGame = async () => {
    try {
      // Reset current player's categories
      await API.resetPlayerCategories(currentPlayer.player_id);
      
      // Create a new game
      const response = await API.createGame(
        'pending', 
        0, 
        currentPlayer.player_id
      );
      
      // Initialize categories
      await API.initializePlayerCategories(currentPlayer.player_id);
      
      // Start the game
      await API.startGame(response.game.game_id);
      
      // Navigate to singleplayer with the game ID
      navigate('/singleplayer', { 
        state: { gameId: response.game.game_id }
      });
    } catch (error) {
      console.error('Error creating new game:', error);
      message.error('Failed to create new game');
    }
  };

  // WebSocket setup
  useEffect(() => {
    let socketInstance = null;
  
    const setupSocket = async () => {
      if (!currentPlayer?.player_id) return;
  
      try {
        socketInstance = await initializeWebSocket(currentPlayer.player_id);
        setSocket(socketInstance);
  
        // Set up event listeners
        socketInstance.on('playersUpdate', (players) => {
          setAvailablePlayers(players.filter(p => p.id !== currentPlayer.player_id));
        });
  
        // Handle disconnection
        socketInstance.on('disconnect', () => {
          message.warning('Lost connection to game server. Attempting to reconnect...');
        });
  
        // Handle reconnection
        socketInstance.on('reconnect', () => {
          message.success('Reconnected to game server');
          
          // Re-emit player joined after reconnection
          socketInstance.emit('playerJoined', {
            id: currentPlayer.player_id,
            name: currentPlayer.name
          }).catch(error => {
            console.error('Error rejoining after reconnection:', error);
          });
        });
  
        // Handle connection state changes
        const checkConnection = setInterval(() => {
          const state = socketInstance.getState();
          if (!state.connected && !state.connecting) {
            socketInstance.reconnect();
          }
        }, 30000); // Check every 30 seconds
  
        return () => {
          clearInterval(checkConnection);
        };
      } catch (error) {
        console.error('WebSocket setup error:', error);
        message.error('Failed to connect to game server');
      }
    };
  
    setupSocket();
  
    // Cleanup function
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [currentPlayer?.player_id]);

  if (isLoading) {
    return (
      <Layout style={{ height: '100vh' }}>
        <div className="flex justify-center items-center h-full">
          <div>Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <GameHeader
        currentPlayer={currentPlayer}
        handleNewGame={handleNewGame}
        handleLogout={() => handleLogout(navigate)}
        socket={socket}
        availablePlayers={availablePlayers}
      />
      
      <Layout.Content className="p-6">
        <LobbyChat currentPlayer={currentPlayer} />
      </Layout.Content>
    </Layout>
  );
}

export default Lobby;