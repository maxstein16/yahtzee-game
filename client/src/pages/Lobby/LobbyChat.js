import React, { useState, useEffect, useRef } from 'react';
import { Card, List, Input, Button, Avatar, Badge, Space, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import initializeWebSocket from '../../services/websocketService';

const { TextArea } = Input;

const LobbyChat = ({ currentPlayer }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!currentPlayer?.player_id) return;

    const connectSocket = async () => {
      try {
        const socketConnection = await initializeWebSocket(currentPlayer.player_id);
        setSocket(socketConnection);

        // Announce player joining with complete player info
        socketConnection.emit('playerJoined', {
          id: currentPlayer.player_id,
          name: currentPlayer.name
        });

        // Listen for player updates and filter out current player
        socketConnection.on('playersUpdate', (players) => {
          console.log('Received players:', players);
          const filteredPlayers = players.filter(p => 
            p.id && p.id.toString() !== currentPlayer.player_id.toString()
          );
          console.log('Filtered players:', filteredPlayers);
          setOnlinePlayers(filteredPlayers);
        });

        // Listen for chat messages
        socketConnection.on('chatMessage', (message) => {
          console.log('Received message:', message);
          setMessages(prev => [...prev, {
            ...message,
            sender: message.sender || currentPlayer.name // Fallback to current player if sender is missing
          }]);
          setTimeout(scrollToBottom, 100);
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

    const messageData = {
      content: messageInput.trim(),
      sender: currentPlayer.name,
      timestamp: new Date().toISOString()
    };

    socket.emit('chatMessage', messageData);
    setMessageInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4" title={`Other Players Online (${onlinePlayers.length})`}>
        <List
          dataSource={onlinePlayers}
          renderItem={player => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Badge status="success" dot>
                    <Avatar icon={<UserOutlined />} />
                  </Badge>
                }
                title={player.name}
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
                {msg.sender && ` - ${msg.sender}`}
              </div>
              <div className={`mt-1 ${msg.sender === currentPlayer.name ? 'text-blue-600' : 'text-gray-800'}`}>
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
              onChange={e => setMessageInput(e.target.value)}
              onKeyPress={e => {
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
    </div>
  );
};

export default LobbyChat;