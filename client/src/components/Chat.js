import React, { useState, useEffect } from 'react';
import socket from '../socket'; // Adjust the path based on your folder structure

function Chat({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Join the specified chat room
    socket.emit('join-room', roomId);

    // Listen for new messages
    socket.on('new-message', (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    // Cleanup on component unmount
    return () => {
      socket.off('new-message'); // Remove listener
    };
  }, [roomId]);

  const sendMessage = () => {
    socket.emit('send-message', { roomId, message });
    setMessage(''); // Clear the input after sending
  };

  return (
    <div>
      <div>
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default Chat;
