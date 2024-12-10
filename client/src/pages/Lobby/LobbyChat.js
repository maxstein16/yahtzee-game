import React, { useState, useEffect, useRef } from 'react';
import { Card, List, Input, Button, Avatar, Badge, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const LobbyChat = ({ currentPlayer, socket, availablePlayers, onPlayerSelect }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!socket) return;

    // Listen for chat messages
    socket.on('chatMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for player updates
    socket.on('playersUpdate', (players) => {
      // Filter out current player from the list
      const otherPlayers = players.filter(p => p.playerId !== currentPlayer.player_id);
      setOnlinePlayers(otherPlayers);
    });

    // Clean up listeners on unmount
    return () => {
      socket.off('chatMessage');
      socket.off('playersUpdate');
    };
  }, [socket, currentPlayer]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!messageInput.trim() || !socket) return;

    const messageData = {
      content: messageInput.trim(),
      timestamp: new Date().toISOString()
    };

    socket.emit('chatMessage', messageData);
    setMessageInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Players List */}
      <Card className="mb-4" title="Online Players">
        <List
          dataSource={onlinePlayers}
          renderItem={player => (
            <List.Item
              actions={[
                <Button 
                  type="primary" 
                  size="small"
                  onClick={() => onPlayerSelect(player)}
                >
                  Invite to Game
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
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No other players online' }}
        />
      </Card>

      {/* Chat Area */}
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
              <span className="font-bold text-blue-600">{msg.sender}: </span>
              <span>{msg.content}</span>
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