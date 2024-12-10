// src/components/GameHeader/GameHeader.jsx
import React, { useState, useEffect } from 'react';
import { Layout, Button, Modal, List, message } from 'antd';
import { createGame } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import initializeWebSocket from '../../services/websocketService';

const { Header } = Layout;

const GameHeader = ({ currentPlayer }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [socket, setSocket] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentPlayer?.player_id) return;

    const connectSocket = async () => {
      try {
        const socketConnection = await initializeWebSocket(currentPlayer.player_id);
        setSocket(socketConnection);

        // Announce player joining with complete player info
        socketConnection.emit('playerJoined', {
          id: currentPlayer.player_id,
          name: currentPlayer.name
        });

        // Listen for player updates and filter out current player and invalid entries
        socketConnection.on('playersUpdate', (players) => {
          const filteredPlayers = players.filter(p => 
            p.id && 
            p.name && 
            p.id.toString() !== currentPlayer.player_id.toString()
          );
          setAvailablePlayers(filteredPlayers);
        });
      } catch (error) {
        console.error('Socket connection error:', error);
        message.error('Failed to connect to game server');
      }
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentPlayer]);

  const handleChallenge = async (opponentId) => {
    if (!currentPlayer?.player_id || !opponentId) {
      console.error('Missing player IDs');
      message.error('Failed to start a new game');
      return;
    }
  
    try {
      const game = await createGame(currentPlayer.player_id, opponentId);
      message.success('Game created! Waiting for the opponent...');
      setIsModalVisible(false);
  
      // Navigate to the game page or trigger socket connection for real-time updates
      navigate(`/game/${game.game.game_id}`);
    } catch (error) {
      console.error('Error creating game:', error);
      message.error('Failed to start a new game');
    }
  };

  return (
    <Header>
      <Button onClick={() => navigate('/singleplayer')}>Single Player</Button>
      <Button
        onClick={() => {
          setIsModalVisible(true);
        }}
      >
        Multiplayer
      </Button>

      {/* Multiplayer Modal */}
      <Modal
        title="Available Players"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <List
          dataSource={availablePlayers}
          renderItem={(player) => (
            <List.Item>
              {player.name}
              <Button onClick={() => handleChallenge(player.id)}>Challenge</Button>
            </List.Item>
          )}
        />
      </Modal>
    </Header>
  );
};

export default GameHeader;