import React, { useState, useEffect } from 'react';
import { message, Layout } from 'antd';
import { useNavigate } from 'react-router-dom';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import initializeWebSocket from '../../services/websocketService';
import LobbyChat from './LobbyChat';
import GameHeader from '../../components/GameHeader/GameHeader';

function Lobby() {
  const navigate = useNavigate();
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

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

  // Initialize WebSocket connection
  useEffect(() => {
    let socketInstance = null;

    const setupSocket = async () => {
      if (!currentPlayer?.player_id) return;

      try {
        const socketConnection = await initializeWebSocket(currentPlayer.player_id);
        socketInstance = socketConnection;
        setSocket(socketConnection);

        socketConnection.on('connect', () => {
          console.log('Socket connected');
          setIsSocketConnected(true);
          
          // Emit player joined event
          socketConnection.emit('playerJoined', {
            id: currentPlayer.player_id,
            name: currentPlayer.name
          });
        });

        socketConnection.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsSocketConnected(false);
        });

        socketConnection.on('playersUpdate', (players) => {
          console.log('Received players update:', players);
          const filteredPlayers = players
            .filter(p => 
              p && 
              p.id && 
              p.name && 
              p.id.toString() !== currentPlayer.player_id.toString()
            )
            .map(p => ({
              id: p.id,
              name: p.name
            }));
          setAvailablePlayers(filteredPlayers);
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        message.error('Failed to connect to game server');
      }
    };

    setupSocket();

    // Cleanup function
    return () => {
      if (socketInstance) {
        console.log('Cleaning up socket connection');
        socketInstance.disconnect();
        setSocket(null);
        setIsSocketConnected(false);
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
        currentPlayer={currentPlayer || {}}
        handleLogout={() => handleLogout(navigate)}
        socket={isSocketConnected ? socket : null}
        availablePlayers={availablePlayers}
      />
      
      <Layout.Content className="p-6">
        {currentPlayer && socket && (
          <LobbyChat 
            currentPlayer={currentPlayer} 
            socket={socket}
          />
        )}
      </Layout.Content>
    </Layout>
  );
}

export default Lobby;