import React, { useState, useEffect } from 'react';
import { Layout, Modal, List, Button, Space, Typography, message } from 'antd';
import { UserOutlined } from 'lucide-react';
import { chatService } from '../services/websocketService';

const { Title, Text } = Typography;

const MultiplayerLobby = ({ 
  isVisible, 
  onClose, 
  currentPlayer,
  onGameStart 
}) => {
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingStates, setLoadingStates] = useState({});

  useEffect(() => {
    if (!isVisible) return;

    // Set up WebSocket connection for multiplayer
    const setupMultiplayer = () => {
      chatService.connect(null, currentPlayer.player_id, currentPlayer.name);

      // Handle available players list updates
      chatService.socket.on('available_players', (players) => {
        setAvailablePlayers(players.filter(p => p.id !== currentPlayer.player_id));
      });

      // Handle incoming game requests
      chatService.socket.on('game_request', (request) => {
        Modal.confirm({
          title: 'Game Request',
          content: `${request.playerName} wants to play a game with you!`,
          okText: 'Accept',
          cancelText: 'Decline',
          onOk: () => {
            chatService.socket.emit('accept_game_request', {
              requestId: request.requestId,
              playerId: currentPlayer.player_id,
              opponentId: request.playerId
            });
          },
          onCancel: () => {
            chatService.socket.emit('decline_game_request', {
              requestId: request.requestId,
              playerId: currentPlayer.player_id,
              opponentId: request.playerId
            });
          }
        });
      });

      // Handle game start
      chatService.socket.on('game_start', (gameData) => {
        onGameStart(gameData);
        onClose();
      });

      // Handle request responses
      chatService.socket.on('request_response', (response) => {
        setLoadingStates(prev => ({...prev, [response.playerId]: false}));
        
        if (response.accepted) {
          message.success(`${response.playerName} accepted your game request!`);
        } else {
          message.error(`${response.playerName} declined your game request`);
        }
      });

      // Request initial player list
      chatService.socket.emit('get_available_players');
    };

    setupMultiplayer();

    // Cleanup on unmount or when modal closes
    return () => {
      chatService.disconnect();
    };
  }, [isVisible, currentPlayer]);

  const handleRequestGame = (player) => {
    setLoadingStates(prev => ({...prev, [player.id]: true}));
    
    chatService.socket.emit('send_game_request', {
      playerId: currentPlayer.player_id,
      opponentId: player.id
    });

    setPendingRequests(prev => [...prev, player.id]);
  };

  return (
    <Modal
      title="Multiplayer Lobby"
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Space direction="vertical" className="w-full">
        <Title level={5}>Available Players</Title>
        <List
          dataSource={availablePlayers}
          renderItem={player => (
            <List.Item
              actions={[
                <Button
                  type="primary"
                  onClick={() => handleRequestGame(player)}
                  loading={loadingStates[player.id]}
                  disabled={pendingRequests.includes(player.id)}
                >
                  {pendingRequests.includes(player.id) ? 'Request Sent' : 'Request Game'}
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={<UserOutlined />}
                title={player.name}
                description={`Status: ${player.status || 'Available'}`}
              />
            </List.Item>
          )}
          locale={{
            emptyText: (
              <div className="text-center py-8">
                <Text type="secondary">No players available</Text>
              </div>
            )
          }}
        />
      </Space>
    </Modal>
  );
};

export default MultiplayerLobby;