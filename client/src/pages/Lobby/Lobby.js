import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentPlayer } from '../../services/authService';
import { initializeWebSocket, disconnectWebSocket } from '../../services/websocketService';
import LobbyChat from './LobbyChat';
import GameHeader from '../../components/GameHeader/GameHeader';

function Lobby() {
  const navigate = useNavigate();
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);

  useEffect(() => {
    const initializePlayer = async () => {
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);
          console.log('Player info:', playerInfo.playerData.name);

          const socket = initializeWebSocket(playerInfo.playerData.player_id);

          // Listen for updates from WebSocket
          socket.on('playersUpdate', (players) => {
            setOnlinePlayers(players);
          });

          return () => {
            socket.disconnect();
          };
        }
      } catch (error) {
        console.error('Error initializing player:', error);
        message.error('Failed to initialize player data');
      }
    };

    initializePlayer();

    return () => {
      disconnectWebSocket();
    };
  }, [navigate]);

  return (
    <Layout style={{ height: '100vh' }}>
      <GameHeader currentPlayer={currentPlayer} availablePlayers={onlinePlayers} />
      <Layout.Content className="p-6">
        <LobbyChat currentPlayer={currentPlayer} />
      </Layout.Content>
    </Layout>
  );
}

export default Lobby;