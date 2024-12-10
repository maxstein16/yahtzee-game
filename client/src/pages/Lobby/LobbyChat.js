import React, { useState, useEffect, useRef } from 'react';
import { Card, List, Input, Button, Avatar, Badge, Space, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const LobbyChat = ({ currentPlayer, socket, onPlayerSelect }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!socket) return;

    // Connection acknowledgment
    socket.on('connectionAck', () => {
      setIsConnected(true);
      // Immediately announce presence
      socket.emit('playerJoined', {
        id: currentPlayer.player_id,
        name: currentPlayer.name
      });
    });

    // Player updates
    socket.on('playersUpdate', (players) => {
      const otherPlayers = players.filter(p => p.playerId !== currentPlayer.player_id);
      setOnlinePlayers(otherPlayers);
    });

    // Chat messages
    socket.on('chatMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // Player notifications
    socket.on('playerJoinedNotification', (data) => {
      setMessages(prev => [
        ...prev,
        {
          content: `${data.name} has joined the chat`,
          timestamp: data.timestamp,
          type: 'notification'
        }
      ]);
    });

    socket.on('playerLeftNotification', (data) => {
      setMessages(prev => [
        ...prev,
        {
          content: `${data.name} has left the chat`,
          timestamp: data.timestamp,
          type: 'notification'
        }
      ]);
    });

    return () => {
      socket.off('connectionAck');
      socket.off('playersUpdate');
      socket.off('chatMessage');
      socket.off('playerJoinedNotification');
      socket.off('playerLeftNotification');
    };
  }, [socket, currentPlayer]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!messageInput.trim() || !socket || !isConnected) {
      if (!isConnected) {
        message.error('Not connected to chat server');
      }
      return;
    }

    const messageData = {
      content: messageInput.trim(),
      timestamp: new Date().toISOString()
    };

    socket.emit('chatMessage', messageData);
    setMessageInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4" title={`Online Players (${onlinePlayers.length})`}>
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
              className={`mb-2 ${
                msg.type === 'notification' 
                  ? 'text-center text-gray-500 text-sm italic' 
                  : msg.sender === currentPlayer.name 
                    ? 'text-right' 
                    : ''
              }`}
            >
              {msg.type === 'notification' ? (
                <div>{msg.content}</div>
              ) : (
                <>
                  <div className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                  <span className="font-bold text-blue-600">{msg.sender}: </span>
                  <span>{msg.content}</span>
                </>
              )}
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
              disabled={!isConnected}
            />
            <Button 
              type="primary"
              onClick={sendMessage}
              disabled={!isConnected}
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