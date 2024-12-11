import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Space, Button, Divider, Modal, List, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';

const { Header } = Layout;

const GameHeader = ({
  currentPlayer,
  handleLogout,
  socket,
  availablePlayers = []
}) => {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState(null);
  const [isChallengePending, setIsChallengePending] = useState(false);

  // Debug log props
  useEffect(() => {
    console.log('GameHeader props:', {
      currentPlayer,
      availablePlayers,
      socketConnected: socket?.connected
    });
  }, [currentPlayer, availablePlayers, socket]);

  const handleNewGame = async () => {
    if (!currentPlayer?.player_id) {
      message.error('Player not initialized');
      return;
    }

    try {
      const response = await API.createGame(
        'pending', 
        0, 
        currentPlayer.player_id
      );
      navigate('/singleplayer', { 
        state: { gameId: response.game.game_id }
      });
    } catch (error) {
      console.error('Error creating new game:', error);
      message.error('Failed to create new game');
    }
  };

  const handleChallenge = useCallback(async (opponent) => {
    if (!socket || !currentPlayer?.player_id) {
      message.error('Connection not available');
      return;
    }

    try {
      const response = await API.createGame(
        'pending', 
        0, 
        currentPlayer.player_id,
        opponent.id
      );
      
      socket.emit('gameChallenge', {
        challenger: { 
          id: currentPlayer.player_id, 
          name: currentPlayer.name 
        },
        opponentId: opponent.id,
        gameId: response.game.game_id
      });

      message.info(`Challenge sent to ${opponent.name}`);
      setPendingChallenge(opponent);
      setIsChallengePending(true);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error creating game:', error);
      message.error('Failed to create game');
    }
  }, [socket, currentPlayer]);

  useEffect(() => {
    if (!socket) return;

    const handleChallengeRequest = ({ challenger, gameId }) => {
      Modal.confirm({
        title: `${challenger.name} has challenged you to a game!`,
        onOk: () => {
          socket.emit('challengeAccepted', { 
            challengerId: challenger.id,
            gameId 
          });
          
          setIsChallengePending(false);
          navigate('/multiplayer', { 
            state: { 
              gameId,
              isChallenger: false,
              opponent: challenger
            }
          });
        },
        onCancel: () => {
          socket.emit('challengeRejected', { challengerId: challenger.id });
          setIsChallengePending(false);
        }
      });
    };

    const handleChallengeAccepted = ({ gameId, opponent }) => {
      setPendingChallenge(null);
      setIsChallengePending(false);
      navigate('/multiplayer', { 
        state: { 
          gameId,
          isChallenger: true,
          opponent
        }
      });
    };

    socket.on('challengeRequest', handleChallengeRequest);
    socket.on('challengeAccepted', handleChallengeAccepted);
    socket.on('challengeRejected', () => {
      setPendingChallenge(null);
      setIsChallengePending(false);
    });

    return () => {
      socket.off('challengeRequest');
      socket.off('challengeAccepted');
      socket.off('challengeRejected');
    };
  }, [socket, navigate]);

  const safeAvailablePlayers = Array.isArray(availablePlayers) ? availablePlayers : [];

  return (
    <Header className="flex items-center justify-between px-6 bg-white shadow">
      <div className="flex items-center gap-4">
        <Button
          type="primary"
          onClick={() => navigate('/singleplayer')}
          className="bg-blue-500"
        >
          Single Player
        </Button>
        <Button
          type="primary"
          onClick={() => setIsModalVisible(true)}
          className="bg-green-500"
        >
          Multiplayer
        </Button>
        <Divider type="vertical" />
        <Button
          onClick={handleNewGame}
          className="bg-yellow-500 text-white hover:bg-yellow-600"
        >
          New Game
        </Button>
      </div>

      <Space>
        <span className="text-gray-700">
          {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
        </span>
        <Button onClick={handleLogout} type="primary" danger>
          Logout
        </Button>
      </Space>

      <Modal
        title="Challenge a Player"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        {safeAvailablePlayers.length > 0 ? (
          <List
            dataSource={safeAvailablePlayers.filter(player => 
              player?.id !== currentPlayer?.player_id
            )}
            renderItem={(player) => (
              <List.Item
                key={player.id}
                actions={[
                  <Button
                    key="challenge"
                    type="primary"
                    onClick={() => handleChallenge(player)}
                    disabled={!!pendingChallenge || isChallengePending}
                  >
                    Challenge
                  </Button>
                ]}
              >
                {player.name || 'Unknown Player'}
              </List.Item>
            )}
          />
        ) : (
          <p>No available players at the moment.</p>
        )}
      </Modal>
    </Header>
  );
};

export default GameHeader;