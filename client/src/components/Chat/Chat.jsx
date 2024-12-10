import React, { useState, useEffect } from 'react';
import { List, Input, Button } from 'antd';
import { onMessage, sendMessage } from '../../services/websocketService';

const Chat = ({ gameId, playerId, playerName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    onMessage((msg) => {
      if (msg.gameId === gameId) {
        setMessages((prev) => [...prev, msg]);
      }
    });
  }, [gameId]);

  const handleSend = () => {
    if (input.trim()) {
      const newMessage = { message: input, sender: playerName, gameId };
      sendMessage(gameId, input, playerName);
      setMessages((prev) => [...prev, newMessage]);
      setInput('');
    }
  };

  return (
    <div>
      <List
        bordered
        dataSource={messages}
        renderItem={(item) => (
          <List.Item>
            <strong>{item.sender}:</strong> {item.message}
          </List.Item>
        )}
      />
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onPressEnter={handleSend}
        placeholder="Type a message..."
      />
      <Button onClick={handleSend} type="primary" style={{ marginTop: '8px' }}>
        Send
      </Button>
    </div>
  );
};

export default Chat;
