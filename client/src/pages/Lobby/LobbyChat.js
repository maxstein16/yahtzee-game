import React, { useState, useEffect, useRef } from 'react';
import { Card, List, Input, Button, Avatar, Badge, Space, Modal, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { initializeWebSocket } from '../../services/websocketService';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';

const { TextArea } = Input;

const LobbyChat = ({ currentPlayer }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [pendingChallenge, setPendingChallenge] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const messagesEndRef = useRef(null);
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

        // Listen for players update
        socketConnection.on('playersUpdate', (players) => {
          const filteredPlayers = players.filter(
            (p) => p.id && p.name && p.id.toString() !== currentPlayer.player_id.toString()
          );
          setOnlinePlayers(filteredPlayers);
        });

        // Load chat history
        socketConnection.on('chatHistory', (history) => {
          setMessages(history);
          setTimeout(scrollToBottom, 100);
        });

        // Listen for new chat messages
        socketConnection.on('chatMessage', (message) => {
          setMessages((prev) => [...prev, message]);
          setTimeout(scrollToBottom, 100);
        });

        // Listen for game challenges
        socketConnection.on('gameChallenge', ({ challenger, gameId }) => {
          setPendingChallenge({ challenger, gameId });
        });

        // Listen for game start signal
        socketConnection.on('gameStart', ({ gameId }) => {
          message.success('Game is starting!');
          navigate(`/game/${gameId}`);
        });
      } catch (error) {
        console.error('Socket connection error:', error);
        message.error('Failed to connect to chat');
      }
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentPlayer]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !socket) return;

    const messageToSend = {
      sender: currentPlayer.name,
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
    };

    socket.emit('chatMessage', messageToSend);
    setMessageInput('');
  };

  const handleRequestToPlay = async (player) => {
    if (!socket) return;
  
    try {
      // Create the game on the server
      const { game } = await API.createGame('pending', 0, currentPlayer.player_id, player.id);
      const gameId = game.game_id; // Ensure the correct gameId from the DB is used
  
      console.log('Game created with ID:', gameId);
  
      // Emit the challenge with the correct gameId
      socket.emit('gameChallenge', {
        challenger: { id: currentPlayer.player_id, name: currentPlayer.name },
        opponentId: player.id,
        gameId,
      });
  
      message.info(`Challenge sent to ${player.name}`);
    } catch (error) {
      console.error('Error creating game:', error);
      message.error('Failed to send challenge');
    }
  };    

  const handleAcceptChallenge = async () => {
    if (!pendingChallenge || !pendingChallenge.gameId) {
      message.error('Invalid game challenge');
      return;
    }
  
    try {
      const { gameId } = pendingChallenge;
      
      // Verify the game exists
      const game = await API.getGameById(gameId);
      if (!game) {
        throw new Error('Game not found');
      }
  
      // Start the game
      await API.startGame(gameId);
  
      // Notify the challenger
      socket.emit('challengeAccepted', {
        challengerId: pendingChallenge.challenger.id,
        gameId: gameId
      });
  
      message.success('Challenge accepted! Starting game...');
      setPendingChallenge(null);
  
      // Navigate to the game
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Error accepting challenge:', error);
      message.error('Failed to start game');
      setPendingChallenge(null);
    }
  };

  const handleDeclineChallenge = () => {
    if (!pendingChallenge) return;

    socket.emit('challengeRejected', { 
      challengerId: pendingChallenge.challenger.id 
    });

    message.warning('Challenge declined.');
    setPendingChallenge(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4" title={`Other Players Online (${onlinePlayers.length})`}>
        <List
          dataSource={onlinePlayers}
          renderItem={(player) => (
            <List.Item
              actions={[
                <Button
                  key="request"
                  type="primary"
                  onClick={() => handleRequestToPlay(player)}
                >
                  Request to Play
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Badge status="success" dot>
                    <Avatar icon={<UserOutlined />} />
                  </Badge>
                }
                title={player.name || `Player ${player.id}`}
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No other players online' }}
        />
      </Card>

      <Card 
        title="Game Chat" 
        className="flex-grow"
        bodyStyle={{ 
          height: 'calc(100% - 48px)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-50 rounded">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 ${msg.sender === currentPlayer.name ? 'text-right' : ''}`}
            >
              <div className="text-xs text-gray-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
              <div className={`mt-1 ${msg.sender === currentPlayer.name ? 'text-blue-600' : 'text-gray-800'}`}>
                <strong>{msg.sender}: </strong>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-auto">
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              autoSize={{ minRows: 1, maxRows: 4 }}
            />
            <Button 
              type="primary"
              onClick={sendMessage}
            >
              Send
            </Button>
          </Space.Compact>
        </div>
      </Card>

      <Modal
        title="Game Challenge"
        visible={!!pendingChallenge}
        onOk={handleAcceptChallenge}
        onCancel={handleDeclineChallenge}
        okText="Accept"
        cancelText="Decline"
      >
        <p>{pendingChallenge?.challenger.name} has challenged you to a game!</p>
      </Modal>
    </div>
  );
};

export default LobbyChat;
