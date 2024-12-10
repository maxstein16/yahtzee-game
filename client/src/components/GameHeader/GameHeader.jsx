import React, { useState, useEffect } from 'react';
import { Layout, Space, Button, Divider, Modal, List, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const GameHeader = ({
  currentPlayer,
  handleNewGame,
  handleLogout,
  socket,
  availablePlayers
}) => {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState(null);
  const [isChallengePending, setIsChallengePending] = useState(false);

  const handleChallenge = (opponent) => {
    if (socket) {
      socket.emit('gameChallenge', {
        challenger: { 
          id: currentPlayer.player_id, 
          name: currentPlayer.name 
        },
        opponentId: opponent.id
      });
      message.info(`Challenge sent to ${opponent.name}`);
      setPendingChallenge(opponent);
      setIsChallengePending(true);
      setIsModalVisible(false);
    } else {
      message.error('Unable to send challenge. No connection to server.');
    }
  };
  

  useEffect(() => {
    if (socket) {
      // Handle challenge request
      socket.on('challengeRequest', ({ challenger }) => {
        Modal.confirm({
          title: `${challenger.name} has challenged you to a game!`,
          onOk: async () => {
            try {
              // Create a new game for both players
              const response = await API.createGame(
                'pending', 
                0, 
                challenger.id, 
                currentPlayer.player_id
              );
              
              // Accept the challenge with the new game ID
              socket.emit('challengeAccepted', { 
                challengerId: challenger.id,
                gameId: response.game.game_id 
              });
              
              message.success('Challenge accepted! Starting game...');
              setIsChallengePending(false);
              
              // Navigate to multiplayer with game info
              navigate('/multiplayer', { 
                state: { 
                  gameId: response.game.game_id,
                  isChallenger: false 
                }
              });
            } catch (error) {
              console.error('Error creating game:', error);
              message.error('Failed to start game');
            }
          },
          onCancel: () => {
            socket.emit('challengeRejected', { challengerId: challenger.id });
            message.warning('Challenge declined.');
            setIsChallengePending(false);
          },
          okText: 'Accept',
          cancelText: 'Decline'
        });
      });

      // Handle challenge accepted
      socket.on('challengeAccepted', ({ gameId }) => {
        message.success('Challenge accepted! Starting game...');
        setPendingChallenge(null);
        setIsChallengePending(false);
        navigate('/multiplayer', { 
          state: { 
            gameId,
            isChallenger: true 
          }
        });
      });

      // Handle challenge rejected
      socket.on('challengeRejected', ({ message: rejectMessage }) => {
        message.warning(rejectMessage || 'Challenge declined.');
        setPendingChallenge(null);
        setIsChallengePending(false);
      });

      // Cleanup listeners on component unmount
      return () => {
        socket.off('challengeRequest');
        socket.off('challengeAccepted');
        socket.off('challengeRejected');
      };
    }
  }, [socket, navigate]);

  return (
    <Header className="flex items-center justify-between px-6 bg-white shadow">
      <div className="flex items-center gap-4">
        {/* Game buttons */}
        <Button
          type="primary"
          onClick={() => navigate('/singleplayer')}
          className="bg-blue-500"
        >
          Single Player
        </Button>
        <Button
          type="primary"
          onClick={() => setIsModalVisible(true)} // Open multiplayer modal
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

      {/* User info and logout */}
      <Space>
        <span className="text-gray-700">
          {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
        </span>
        <Button onClick={handleLogout} type="primary" danger>
          Logout
        </Button>
      </Space>

      {/* Multiplayer Challenge Modal */}
      <Modal
        title="Challenge a Player"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        {availablePlayers.length > 0 ? (
          <List
            dataSource={availablePlayers.filter(player => player.id !== currentPlayer.player_id)}
            renderItem={(player) => (
              <List.Item
                actions={[
                  <Button
                    type="primary"
                    onClick={() => handleChallenge(player)}
                    disabled={!!pendingChallenge || isChallengePending} // Disable if a challenge is pending
                  >
                    Challenge
                  </Button>
                ]}
              >
                {player.name}
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
