import React, { useState, useEffect } from 'react';
import { List, Button, Modal, message, Space, Typography, Card } from 'antd';
import { UserOutlined, LoadingOutlined } from 'lucide-react';

const { Text, Title } = Typography;

const MultiplayerLobby = ({ 
  currentPlayer, 
  onGameStart, 
  webSocketService,
  isVisible,
  onClose 
}) => {
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingStates, setLoadingStates] = useState({});

  useEffect(() => {
    if (!webSocketService || !isVisible) return;

    const handlePlayerList = (players) => {
      setAvailablePlayers(players.filter(p => p.id !== currentPlayer.player_id));
    };

    const handleGameRequest = (request) => {
      setPendingRequests(prev => [...prev, request]);
      
      Modal.confirm({
        title: 'Game Request',
        content: `${request.playerName} wants to play a game with you!`,
        okText: 'Accept',
        cancelText: 'Decline',
        onOk: () => {
          webSocketService.emit('accept_game_request', {
            requestId: request.requestId,
            playerId: currentPlayer.player_id,
            opponentId: request.playerId
          });
        },
        onCancel: () => {
          webSocketService.emit('decline_game_request', {
            requestId: request.requestId,
            playerId: currentPlayer.player_id,
            opponentId: request.playerId
          });
        }
      });
    };

    const handleGameStart = (gameData) => {
      onGameStart(gameData);
      onClose();
    };

    const handleRequestResponse = (response) => {
      setLoadingStates(prev => ({...prev, [response.playerId]: false}));
      
      if (response.accepted) {
        message.success(`${response.playerName} accepted your game request!`);
      } else {
        message.error(`${response.playerName} declined your game request`);
      }
    };

    webSocketService.on('available_players', handlePlayerList);
    webSocketService.on('game_request', handleGameRequest);
    webSocketService.on('game_start', handleGameStart);
    webSocketService.on('request_response', handleRequestResponse);

    // Request initial player list
    webSocketService.emit('get_available_players');

    return () => {
      webSocketService.off('available_players', handlePlayerList);
      webSocketService.off('game_request', handleGameRequest);
      webSocketService.off('game_start', handleGameStart);
      webSocketService.off('request_response', handleRequestResponse);
    };
  }, [webSocketService, isVisible, currentPlayer.player_id]);

  const handleRequestGame = (player) => {
    setLoadingStates(prev => ({...prev, [player.id]: true}));
    
    webSocketService.emit('send_game_request', {
      playerId: currentPlayer.player_id,
      opponentId: player.id
    });
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
        <Card>
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
                    disabled={loadingStates[player.id]}
                  >
                    Request Game
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<UserOutlined size={24} />}
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
        </Card>

        {pendingRequests.length > 0 && (
          <Card>
            <Title level={5}>Pending Requests</Title>
            <List
              dataSource={pendingRequests}
              renderItem={request => (
                <List.Item>
                  <Text>Request from {request.playerName}</Text>
                  {request.loading && <LoadingOutlined className="ml-2" />}
                </List.Item>
              )}
            />
          </Card>
        )}
      </Space>
    </Modal>
  );
};

export default MultiplayerLobby;