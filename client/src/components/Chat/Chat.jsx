import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Typography, Space, message } from 'antd';
import { webSocketService } from '../../services/websocketService'

const { Text } = Typography;

export default function Chat({ gameId, playerId, playerName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState(new Set());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    webSocketService.connect(gameId, playerId, playerName);

    const messageHandler = (msg) => {
      setMessages((prev) => [...prev, msg]);
      setParticipants((prev) => new Set(prev).add(msg.playerName));
    };

    const connectionHandler = (status) => {
      setIsConnected(status);
      if (status) {
        message.success('Connected to chat');
      } else {
        message.warning('Disconnected from chat');
      }
    };

    const playerJoinedHandler = (data) => {
      setParticipants((prev) => new Set(prev).add(data.playerName));
      setMessages((prev) => [
        ...prev,
        {
          type: 'system',
          text: `${data.playerName} joined the chat`,
          timestamp: data.timestamp,
        },
      ]);
    };

    const playerLeftHandler = (data) => {
      setParticipants((prev) => new Set(prev).delete(data.playerName));
      setMessages((prev) => [
        ...prev,
        {
          type: 'system',
          text: `${data.playerName} left the chat`,
          timestamp: data.timestamp,
        },
      ]);
    };

    webSocketService.onMessage(messageHandler);
    webSocketService.onConnectionChange(connectionHandler);
    webSocketService.onPlayerJoined(playerJoinedHandler);
    webSocketService.onPlayerLeft(playerLeftHandler);

    return () => {
      webSocketService.disconnect();
    };
  }, [gameId, playerId, playerName]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && isConnected) {
      const messageData = {
        gameId,
        playerId,
        playerName,
        text: newMessage.trim(),
        timestamp: new Date().toISOString(),
      };

      if (webSocketService.sendMessage(messageData)) {
        setNewMessage('');
      } else {
        message.error('Failed to send message');
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-2 p-2 bg-gray-100 rounded">
        <Text type="secondary">
          {Array.from(participants).join(', ')} {participants.size === 1 ? 'is' : 'are'} in the chat
        </Text>
      </div>

      <List
        className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded"
        dataSource={messages}
        renderItem={(msg) => (
          <List.Item
            className={`flex ${
              msg.type === 'system'
                ? 'justify-center'
                : msg.playerId === playerId
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            {msg.type === 'system' ? (
              <Text type="secondary" italic>
                {msg.text}
              </Text>
            ) : (
              <div
                className={`max-w-[70%] p-2 rounded ${
                  msg.playerId === playerId ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                <div className="text-xs opacity-75 mb-1">
                  {msg.playerName} • {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                <Text className={msg.playerId === playerId ? 'text-white' : 'text-gray-700'}>
                  {msg.text}
                </Text>
              </div>
            )}
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
        <Button type="primary" onClick={handleSend} disabled={!isConnected || !newMessage.trim()}>
          Send
        </Button>
      </Space.Compact>

      {!isConnected && (
        <Text type="warning" className="mt-2 text-center">
          Connecting to chat...
        </Text>
      )}
    </div>
  );
}