import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Typography, Space } from 'antd';
import { chatService } from '../services/websocketChatService';

export default function Chat({ gameId, playerId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    chatService.connect(gameId, playerId);

    const messageCleanup = chatService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    const connectionCleanup = chatService.onConnectionChange(setIsConnected);

    scrollToBottom();

    return () => {
      messageCleanup();
      connectionCleanup();
      chatService.disconnect();
    };
  }, [gameId, playerId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && isConnected) {
      chatService.sendMessage({
        gameId,
        playerId,
        text: newMessage.trim(),
        timestamp: new Date().toISOString()
      });
      setNewMessage('');
    }
  };

  return (
    <div className="w-full max-h-96 flex flex-col">
      <List
        className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded"
        dataSource={messages}
        renderItem={(msg) => (
          <List.Item className={`flex ${msg.playerId === playerId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-2 rounded ${
              msg.playerId === playerId ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}>
              <Typography.Text className={msg.playerId === playerId ? 'text-white' : 'text-gray-700'}>
                {msg.text}
              </Typography.Text>
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