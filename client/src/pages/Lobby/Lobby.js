// src/pages/Lobby/Lobby.js
import React, { useState, useEffect } from 'react';
import { message, Layout, Modal, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import initializeWebSocket from '../../services/websocketService';
import { getAvailablePlayers, createGame } from '../../utils/api';
import LobbyChat from './LobbyChat';
import GameHeader from '../../components/GameHeader/GameHeader';

function Lobby() {
  const navigate = useNavigate();

  // Basic state
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Socket state
  const [socket, setSocket] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [isMultiplayerModalVisible, setIsMultiplayerModalVisible] = useState(false);

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

  // WebSocket setup
  useEffect(() => {
    if (currentPlayer?.player_id) {
      initializeWebSocket(null, currentPlayer.player_id)
        .then(socketConnection => {
          setSocket(socketConnection);
          
          socketConnection.on('connect', () => {
            console.log('Connected to game server');
            socketConnection.emit('playerJoined', {
              id: currentPlayer.player_id,
              name: currentPlayer.name
            });
          });

          socketConnection.on('playersUpdate', (players) => {
            setAvailablePlayers(players);
          });
        })
        .catch(error => {
          console.error('WebSocket connection error:', error);
          message.error('Failed to connect to game server');
        });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentPlayer?.player_id]);

  const handleNewGame = async (gameType) => {
    if (gameType === 'multiplayer') {
      setIsMultiplayerModalVisible(true);
    } else {
      // Handle singleplayer game creation
      console.log('New singleplayer game');
    }
  };

  const handleMultiplayerGameCreation = async (opponentId) => {
    try {
      const game = await createGame(currentPlayer.player_id, opponentId);
      setIsMultiplayerModalVisible(false);
      // Proceed to the game page with the created game information
      console.log('Multiplayer game created:', game);
    } catch (error) {
      console.error('Error creating multiplayer game:', error);
      message.error('Failed to create multiplayer game');
    }
  };

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
      />
      
      <Layout.Content className="p-6">
        <LobbyChat currentPlayer={currentPlayer} />
      </Layout.Content>

      <Modal
        title="Multiplayer Game"
        visible={isMultiplayerModalVisible}
        onCancel={() => setIsMultiplayerModalVisible(false)}
        footer={null}
      >
        <h2>Challenge a Player</h2>
        <ul>
          {availablePlayers.map((player) => (
            <li key={player.player_id}>
              {player.name}
              <Button onClick={() => handleMultiplayerGameCreation(player.player_id)}>
                Challenge
              </Button>
            </li>
          ))}
        </ul>
      </Modal>
    </Layout>
  );
}

export default Lobby;