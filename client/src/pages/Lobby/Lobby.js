// src/components/Lobby/Lobby.js
import React, { useState, useEffect } from 'react';
import { message, Layout } from 'antd';
import { useNavigate } from 'react-router-dom';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import initializeWebSocket from '../../services/websocketService';
import LobbyChat from './LobbyChat';
import GameHeader from '../../components/GameHeader/GameHeader';

const VIEW_STATES = {
  LOBBY: 'lobby',
  GAME: 'game'
};

function Lobby() {
  const navigate = useNavigate();

  // Basic state
  const [currentView, setCurrentView] = useState(VIEW_STATES.LOBBY);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);

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

          socketConnection.on('chatMessage', (message) => {
            setMessages(prev => [...prev, message]);
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

  const handleNewGame = async (gameType = 'singleplayer') => {
    if (gameType === 'multiplayer') {
      setIsMultiplayerModalVisible(true);
      setCurrentView(VIEW_STATES.LOBBY);
    } else {
      setCurrentView(VIEW_STATES.GAME);
    }
  };

  const handlePlayerSelect = async (selectedPlayer) => {
    setCurrentView(VIEW_STATES.GAME);
    message.success('Multiplayer game started!');
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
        setIsMultiplayerModalVisible={setIsMultiplayerModalVisible}
        setCurrentView={setCurrentView}
      />
      
      <Layout.Content className="p-6">
        <LobbyChat
          currentPlayer={currentPlayer}
          socket={socket}
          availablePlayers={availablePlayers}
          onPlayerSelect={handlePlayerSelect}
          messages={messages}
        />
      </Layout.Content>
    </Layout>
  );
}

export default Lobby;