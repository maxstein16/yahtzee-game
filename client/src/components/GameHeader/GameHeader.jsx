import React, { useState, useEffect } from 'react';
import { Layout, Button, Modal, List, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import initializeWebSocket from '../../services/websocketService';

const { Header } = Layout;

const GameHeader = ({ currentPlayer }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [isChallengeSent, setIsChallengeSent] = useState(false);
  const [challengedPlayer, setChallengedPlayer] = useState(null);
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
          setChallengedPlayer(challenger);
          message.info(`${challenger.name} has challenged you!`);
        });

        socketConnection.on('challengeAccepted', (game) => {
          message.success('Challenge accepted! Game started.');
          navigate(`/game/${game.game_id}`);
        });

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
    console.log('Challenging player:', opponent);
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