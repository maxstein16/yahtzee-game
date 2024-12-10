import React, { useState, useEffect } from 'react';
import { Modal, List, Button, Avatar, Badge, message, Spin } from 'antd';
import { UserOutlined, LoadingOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const MultiplayerModal = ({ 
  visible, 
  onClose, 
  onPlayerSelect, 
  currentPlayerId,
  socket,
  availablePlayers
}) => {
  const [players, setPlayers] = useState(availablePlayers);
  const [pendingRequests, setPendingRequests] = useState({});
  const [loading, setLoading] = useState(true);

  // Define handlers
  const handlePlayersUpdate = (connectedPlayers) => {
    setPlayers(connectedPlayers.filter(p => p.id !== currentPlayerId));
    setLoading(false);
  };

  const handleGameRequest = (requestingPlayer) => {
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
  };

  const handleGameRequestResponse = ({ playerId, accepted }) => {
    setPendingRequests(prev => ({ ...prev, [playerId]: false }));
    if (accepted) {
      const player = players.find(p => p.id === playerId);
      if (player) {
        onPlayerSelect(player);
        onClose();
      }
    } else {
      message.error('Player declined your game request');
    }
  };

  useEffect(() => {
    setPlayers(availablePlayers);
  }, [availablePlayers]);

  useEffect(() => {
    if (!socket || !visible) {
      return;
    }

    console.log('Socket instance:', socket);

    // Add listeners
    socket.on('playersUpdate', handlePlayersUpdate);
    socket.on('gameRequest', handleGameRequest);
    socket.on('gameRequestResponse', handleGameRequestResponse);

    // Cleanup function
    const cleanupListeners = () => {
      socket.off('playersUpdate', handlePlayersUpdate);
      socket.off('gameRequest', handleGameRequest);
      socket.off('gameRequestResponse', handleGameRequestResponse);
    };

    return cleanupListeners;
  }, [socket, visible, currentPlayerId, onPlayerSelect, onClose]);

  const handleRequestGame = (playerId) => {
    if (!socket) {
      message.error('Socket connection not available');
      return;
    }

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
              key={player.id}
              actions={[
                <Button
                  key="request"
                  type="primary"
                  loading={pendingRequests[player.id]}
                  onClick={() => handleRequestGame(player.id)}
                  disabled={!socket}
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

MultiplayerModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onPlayerSelect: PropTypes.func.isRequired,
  currentPlayerId: PropTypes.string.isRequired,
  socket: PropTypes.object
};

export default MultiplayerModal;