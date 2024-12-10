import React, { useState, useEffect } from 'react';
import { Modal, List, Button, Avatar, message, Spin } from 'antd';
import { UserOutlined } from 'lucide-react';

const MultiplayerLobby = ({ 
  visible, 
  onClose, 
  currentPlayer, 
  onStartGame, 
  websocket 
}) => {
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestInProgress, setRequestInProgress] = useState(false);

  useEffect(() => {
    if (websocket && visible) {
      // Request connected players list when lobby opens
      websocket.emit('getConnectedPlayers');
      
      // Listen for updates to connected players list
      websocket.on('connectedPlayers', (players) => {
        setConnectedPlayers(players.filter(p => p.player_id !== currentPlayer.player_id));
        setLoading(false);
      });

      // Listen for game requests
      websocket.on('gameRequest', (request) => {
        setPendingRequests(prev => [...prev, request]);
        message.info(`${request.playerName} wants to play with you!`);
      });

      // Listen for request responses
      websocket.on('gameRequestResponse', (response) => {
        setRequestInProgress(false);
        if (response.accepted) {
          message.success('Game request accepted!');
          onStartGame(response.gameId, response.opponentId);
          onClose();
        } else {
          message.error('Game request declined');
        }
      });
    }

    return () => {
      if (websocket) {
        websocket.off('connectedPlayers');
        websocket.off('gameRequest');
        websocket.off('gameRequestResponse');
      }
    };
  }, [websocket, visible, currentPlayer, onStartGame, onClose]);

  const handleSendRequest = (player) => {
    setRequestInProgress(true);
    websocket.emit('sendGameRequest', {
      toPlayerId: player.player_id,
      fromPlayerId: currentPlayer.player_id,
      playerName: currentPlayer.name
    });
  };

  const handleRequestResponse = (request, accepted) => {
    websocket.emit('respondToGameRequest', {
      requestId: request.id,
      accepted,
      fromPlayerId: request.fromPlayerId,
      toPlayerId: currentPlayer.player_id
    });

    setPendingRequests(prev => 
      prev.filter(r => r.id !== request.id)
    );

    if (accepted) {
      onClose();
    }
  };

  return (
    <Modal
      title="Multiplayer Lobby"
      open={visible}
      onCancel={onClose}
      footer={null}
      className="w-full max-w-2xl"
    >
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Pending Requests</h3>
          <List
            dataSource={pendingRequests}
            renderItem={(request) => (
              <List.Item
                actions={[
                  <Button
                    key="accept"
                    type="primary"
                    onClick={() => handleRequestResponse(request, true)}
                  >
                    Accept
                  </Button>,
                  <Button
                    key="decline"
                    danger
                    onClick={() => handleRequestResponse(request, false)}
                  >
                    Decline
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={request.playerName}
                  description="Wants to play with you"
                />
              </List.Item>
            )}
          />
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">Available Players</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : (
          <List
            dataSource={connectedPlayers}
            renderItem={(player) => (
              <List.Item
                actions={[
                  <Button
                    key="play"
                    type="primary"
                    onClick={() => handleSendRequest(player)}
                    disabled={requestInProgress}
                  >
                    Request to Play
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={player.name}
                  description={player.status || 'Available'}
                />
              </List.Item>
            )}
            locale={{
              emptyText: 'No other players online'
            }}
          />
        )}
      </div>
    </Modal>
  );
};

export default MultiplayerLobby;