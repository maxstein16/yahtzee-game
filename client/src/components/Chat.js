import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, List, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import * as API from '../utils/api';
import { initializeWebSocket } from '../services/websocketService';

function Chat({ gameId, playerId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messageListRef = useRef(null);

  useEffect(() => {
    if (!gameId) return;

    const fetchChatHistory = async () => {
      try {
        const chatHistory = await API.getChatMessages(gameId);
        setMessages(chatHistory);
      } catch (error) {
        message.error('Failed to load chat history: ' + error.message);
      }
    };

    const initSocket = async () => {
      try {
        const newSocket = await initializeWebSocket(gameId, playerId);
        newSocket.on('NEW_CHAT_MESSAGE', (chatMessage) => {
          setMessages(prevMessages => [...prevMessages, chatMessage]);
        });
        setSocket(newSocket);
      } catch (error) {
        message.error('WebSocket connection failed: ' + error.message);
      }
    };

    fetchChatHistory();
    initSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [gameId, playerId]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !gameId || !playerId) return;

    try {
      await API.sendMessage(gameId, playerId, newMessage);
      setNewMessage('');
    } catch (error) {
      message.error('Failed to send message: ' + error.message);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div ref={messageListRef} style={{ flexGrow: 1, overflowY: 'auto', padding: '10px' }}>
        <List
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item style={{ 
              flexDirection: 'column',
              alignItems: 'flex-start',
              backgroundColor: msg.player_id === playerId ? '#e6f7ff' : 'white'
            }}>
              <div style={{ fontWeight: 'bold' }}>{msg.player_name}</div>
              <div>{msg.message}</div>
              <div style={{ fontSize: '10px', color: '#999' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </List.Item>
          )}
        />
      </div>
      <div style={{ display: 'flex', padding: '10px' }}>
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ marginRight: '10px' }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

export default Chat;