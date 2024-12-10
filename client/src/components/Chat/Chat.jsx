import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Typography, Space, message } from 'antd';
import { chatService } from '../../services/websocketService';

const { Text } = Typography;

export default function Chat({ gameId, playerId, playerName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    console.log('Connected to room:', {
      gameId,
      playerId,
      playerName
    });
    
    // Debug socket rooms
    if (chatService.socket) {
      console.log('Socket rooms:', chatService.socket.rooms);
    }
  }, []);

  useEffect(() => {
    // Connect to WebSocket
    chatService.connect(gameId, playerId, playerName);

    // Single message handler for both new messages and history
    const messageHandler = (msg) => {
      if (Array.isArray(msg)) {
        // This is chat history
        console.log('Received chat history:', msg);
        setMessages(msg);
      } else {
        // This is a new message
        console.log('Received message:', msg);
        setMessages(prev => [...prev, msg]);
      }
    };

    // Set up event listeners
    chatService.onMessage(messageHandler);
    chatService.onConnectionChange(setIsConnected);

    // Cleanup
    return () => {
      chatService.disconnect();
    };
  }, [gameId, playerId, playerName]);

  // Rest of your component remains the same
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && isConnected) {
      const messageData = {
        gameId,
        playerId,
        playerName,
        text: newMessage.trim()
      };
      
      if (chatService.sendMessage(messageData)) {
        setNewMessage('');
      } else {
        message.error('Failed to send message');
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <List
        className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded"
        dataSource={messages}
        renderItem={(msg) => (
          <List.Item 
            className={`flex ${msg.playerId === playerId ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[70%] p-2 rounded ${
                msg.playerId === playerId ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              <div className="text-xs opacity-75 mb-1">
                {msg.playerName} • {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
              <Text 
                className={msg.playerId === playerId ? 'text-white' : 'text-gray-700'}
              >
                {msg.text}
              </Text>
            </div>
          </List.Item>
        )}
      />
      <div ref={messagesEndRef} />
      
      <Space.Compact className="w-full">
        <Input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onPressEnter={handleSend}
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <Button 
          type="primary"
          onClick={handleSend}
          disabled={!isConnected || !newMessage.trim()}
        >
          Send
        </Button>
      </Space.Compact>
    </div>
  );
}