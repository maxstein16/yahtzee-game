import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentPlayer } from '../../services/authService';
import { initializeWebSocket, disconnectWebSocket } from '../../services/websocketService';
import LobbyChat from './LobbyChat';
import GameHeader from '../../components/GameHeader/GameHeader';
import API from '../../utils/api';

function Lobby() {
  const navigate = useNavigate();
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);

  useEffect(() => {
    const initializePlayer = async () => {
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);
          initializeWebSocket(playerInfo.playerData.player_id);

          // Poll server every 30 seconds for updates
          const interval = setInterval(async () => {
            const players = await API.getAvailablePlayers();
            setAvailablePlayers(players);
          }, 30000);

          return () => clearInterval(interval);
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
      <GameHeader currentPlayer={currentPlayer} availablePlayers={availablePlayers} />
      <Layout.Content className="p-6">
        <LobbyChat currentPlayer={currentPlayer} />
      </Layout.Content>
    </Layout>
  );
}

export default Lobby;