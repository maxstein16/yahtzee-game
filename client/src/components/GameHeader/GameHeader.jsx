import React, { useState, useEffect } from 'react';
import { Layout, Button, Modal, List, message, Avatar, Badge } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import initializeWebSocket from '../../services/websocketService';

const { Header } = Layout;

const GameHeader = ({ currentPlayer }) => {
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [socket, setSocket] = useState(null);
  const [challengedPlayer, setChallengedPlayer] = useState(null);
  const [isChallengeSent, setIsChallengeSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentPlayer?.player_id) return;

    const connectSocket = async () => {
      try {
        const socketConnection = await initializeWebSocket(currentPlayer.player_id);
        setSocket(socketConnection);

        // Announce player joining
        socketConnection.emit('playerJoined', {
          id: currentPlayer.player_id,
          name: currentPlayer.name,
        });

        // Update online players
        socketConnection.on('playersUpdate', (players) => {
          const filteredPlayers = players.filter(
            (p) => p.id && p.name && String(p.id) !== String(currentPlayer.player_id)
          );
          setOnlinePlayers(filteredPlayers);
        });

        // Handle challenge received
        socketConnection.on('challengeReceived', ({ challenger }) => {
          setChallengedPlayer(challenger);
          message.info(`${challenger.name} has challenged you!`);
        });

        // Handle challenge accepted
        socketConnection.on('challengeAccepted', (game) => {
          message.success('Challenge accepted! Game started.');
          navigate(`/game/${game.game_id}`);
        });

        // Handle challenge rejected
        socketConnection.on('challengeRejected', (challengerId) => {
          if (challengerId === currentPlayer.player_id) {
            message.info('Your challenge was rejected.');
            setIsChallengeSent(false);
            setChallengedPlayer(null);
          }
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
  }, [currentPlayer, navigate]);

  const handleChallenge = async (opponent) => {
    if (!socket || !currentPlayer?.player_id || !opponent.id) return;

    try {
      await socket.emit('challengePlayer', {
        challengerId: currentPlayer.player_id,
        challengerName: currentPlayer.name,
        opponentId: opponent.id,
      });
      setIsChallengeSent(true);
      setChallengedPlayer(opponent);
      message.success(`Challenge sent to ${opponent.name}`);
    } catch (error) {
      console.error('Error sending challenge:', error);
      message.error('Failed to send challenge');
    }
  };

  const handleAcceptChallenge = () => {
    if (!socket || !challengedPlayer) return;
    socket.emit('acceptChallenge', {
      challengerId: challengedPlayer.id,
      challengerName: challengedPlayer.name,
      acceptorId: currentPlayer.player_id,
    });
  };

  const handleRejectChallenge = () => {
    if (!socket || !challengedPlayer) return;
    socket.emit('rejectChallenge', {
      challengerId: challengedPlayer.id,
    });
    setChallengedPlayer(null);
  };

  return (
    <Header>
      <Button onClick={() => navigate('/singleplayer')}>Single Player</Button>
      <Button onClick={() => setIsModalVisible(true)}>Multiplayer</Button>

      {/* Multiplayer Modal */}
      <Modal
        title={`Other Players Online (${onlinePlayers.length})`}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <List
          dataSource={onlinePlayers}
          renderItem={(player) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Badge status="success" dot>
                    <Avatar icon={<UserOutlined />} />
                  </Badge>
                }
                title={player.name}
              />
              <Button
                onClick={() => handleChallenge(player)}
                disabled={isChallengeSent && challengedPlayer?.id === player.id}
              >
                {isChallengeSent && challengedPlayer?.id === player.id
                  ? 'Challenge Sent'
                  : 'Challenge'}
              </Button>
            </List.Item>
          )}
          locale={{ emptyText: 'No other players online' }}
        />
      </Modal>

      {/* Challenge Received Modal */}
      <Modal
        title="Challenge Received"
        visible={!!challengedPlayer}
        onCancel={handleRejectChallenge}
        footer={[
          <Button key="reject" onClick={handleRejectChallenge}>
            Reject
          </Button>,
          <Button key="accept" type="primary" onClick={handleAcceptChallenge}>
            Accept
          </Button>,
        ]}
      >
        <p>{challengedPlayer?.name} has challenged you. Do you want to accept?</p>
      </Modal>
    </Header>
  );
};

export default GameHeader;