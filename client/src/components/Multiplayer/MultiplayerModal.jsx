import React, { useState, useEffect } from 'react';
import { Modal, List, Button, Avatar, Badge, message, Spin } from 'antd';
import { UserOutlined, LoadingOutlined } from '@ant-design/icons';

const MultiplayerModal = ({ 
  visible, 
  onClose, 
  onPlayerSelect, 
  currentPlayerId,
  socket 
}) => {
  const [players, setPlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (socket && visible) {
      // Listen for available players updates
      socket.on('playersUpdate', (connectedPlayers) => {
        setPlayers(connectedPlayers.filter(p => p.id !== currentPlayerId));
        setLoading(false);
      });

      // Listen for game requests
      socket.on('gameRequest', (requestingPlayer) => {
        Modal.confirm({
          title: 'Game Request',
          content: `${requestingPlayer.name} wants to play with you!`,
          onOk: () => {
            socket.emit('acceptGame', requestingPlayer.id);
            onPlayerSelect(requestingPlayer);
            onClose();
          },
          onCancel: () => {
            socket.emit('rejectGame', requestingPlayer.id);
          }
        });
      });

      // Listen for request responses
      socket.on('gameRequestResponse', ({ playerId, accepted }) => {
        setPendingRequests(prev => ({ ...prev, [playerId]: false }));
        if (accepted) {
          const player = players.find(p => p.id === playerId);
          onPlayerSelect(player);
          onClose();
        } else {
          message.error('Player declined your game request');
        }
      });

      // Request current players list
      socket.emit('getPlayers');
    }

    return () => {
      if (socket) {
        socket.off('playersUpdate');
        socket.off('gameRequest');
        socket.off('gameRequestResponse');
      }
    };
  }, [socket, visible, currentPlayerId, players, onPlayerSelect, onClose]);

  const handleRequestGame = (playerId) => {
    setPendingRequests(prev => ({ ...prev, [playerId]: true }));
    socket.emit('requestGame', playerId);
  };

  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  return (
    <Modal
      title="Available Players"
      open={visible}
      onCancel={onClose}
      footer={null}
      className="w-full max-w-lg"
    >
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Spin indicator={antIcon} />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No other players available
        </div>
      ) : (
        <List
          dataSource={players}
          renderItem={(player) => (
            <List.Item
              actions={[
                <Button
                  type="primary"
                  loading={pendingRequests[player.id]}
                  onClick={() => handleRequestGame(player.id)}
                >
                  Request Game
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Badge status="success" dot>
                    <Avatar icon={<UserOutlined />} />
                  </Badge>
                }
                title={player.name}
                description={`Score: ${player.score || 0}`}
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
};

export default MultiplayerModal;