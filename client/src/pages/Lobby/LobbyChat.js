import React, { useState, useEffect, useRef } from 'react';
import { Card, List, Input, Button, Avatar, Badge, Space, message } from 'antd';
import { UserOutlined, LoadingOutlined } from '@ant-design/icons';
import initializeWebSocket from '../../services/websocketService';

const { TextArea } = Input;

const LobbyChat = ({ currentPlayer }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    
    const connectWebSocket = async () => {
      try {
        const socketConnection = await initializeWebSocket(currentPlayer.player_id);
        
        if (!mounted) return;
        
        setSocket(socketConnection);
        setIsConnected(true);
        
        // Listen for player updates
        socketConnection.on('playersUpdate', (players) => {
          if (!mounted) return;
          const otherPlayers = players.filter(p => p.id !== currentPlayer.player_id);
          setOnlinePlayers(otherPlayers);
        });

        // Listen for chat messages
        socketConnection.on('chatMessage', (message) => {
          if (!mounted) return;
          setMessages(prev => [...prev, message]);
          scrollToBottom();
        });

        // Listen for connection state
        socketConnection.on('disconnect', () => {
          if (!mounted) return;
          setIsConnected(false);
          message.error('Disconnected from chat server');
        });

        socketConnection.on('reconnect', () => {
          if (!mounted) return;
          setIsConnected(true);
          message.success('Reconnected to chat server');
        });

      } catch (error) {
        if (!mounted) return;
        console.error('Failed to connect to chat:', error);
        message.error('Failed to connect to chat server');
      }
    };

    if (currentPlayer?.player_id) {
      connectWebSocket();
    }

    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentPlayer]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !socket || !isConnected) {
      if (!isConnected) {
        message.error('Not connected to chat server');
      }
      return;
    }

    // Send the message
    socket.sendMessage(messageInput.trim());
    setMessageInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <Card 
        className="mb-4" 
        title={
          <div className="flex items-center">
            <span>Online Players ({onlinePlayers.length})</span>
            {!isConnected && <LoadingOutlined className="ml-2" />}
          </div>
        }
      >
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
          locale={{ emptyText: isConnected ? 'No other players online' : 'Connecting...' }}
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
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              disabled={!isConnected}
              autoSize={{ minRows: 1, maxRows: 4 }}
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