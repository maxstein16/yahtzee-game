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
  
        socketConnection.emit('playerJoined', {
          id: currentPlayer.player_id,
          name: currentPlayer.name,
        });
  
        socketConnection.on('playersUpdate', (players) => {
          const filteredPlayers = players.filter(
            (p) => p.id && p.name && p.id.toString() !== currentPlayer.player_id.toString()
          );
          setAvailablePlayers(filteredPlayers);
        });
  
        socketConnection.on('challengeReceived', ({ challenger }) => {
          Modal.confirm({
            title: `${challenger.name} has challenged you!`,
            content: 'Do you accept the challenge?',
            onOk: async () => {
              socketConnection.emit('challengeResponse', {
                challengerId: challenger.id,
                response: 'accepted',
              });
            },
            onCancel: () => {
              socketConnection.emit('challengeResponse', {
                challengerId: challenger.id,
                response: 'rejected',
              });
            },
          });
        });
  
        socketConnection.on('gameStarted', (game) => {
          navigate(`/game/${game.game_id}`);
        });
      } catch (error) {
        console.error('Socket connection error:', error);
        message.error('Failed to connect to game server');
      }
    };
  
    connectSocket();
  
    return () => {
      if (socket) socket.disconnect();
    };
  }, [currentPlayer]);

  const handleChallenge = (opponent) => {
    if (!socket) return;
    socket.emit('challengePlayer', {
      challenger: currentPlayer,
      opponentId: opponent.id,
    });
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
              <Button onClick={() => handleChallenge(player)}>Challenge</Button>
            </List.Item>
          )}
        />
      </Modal>
    </Header>
  );
};

export default GameHeader;