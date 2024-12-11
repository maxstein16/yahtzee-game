// services/websocketService.js
import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';
let socket = null;

export const initializeWebSocket = (playerId) => {
  // Only create a new connection if one doesn't exist
  if (socket && socket.connected) {
    return Promise.resolve(socket);
  }

  return new Promise((resolve, reject) => {
    try {
      socket = io(WS_BASE_URL, {
        query: { playerId },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
      });

      // Simplified socket interface focused on chat
      const socketInterface = {
        // Chat-specific methods
        sendChatMessage: (message) => {
          socket.emit('chatMessage', {
            content: message,
            timestamp: new Date().toISOString()
          });
        },
        onChatMessage: (callback) => {
          socket.on('chatMessage', callback);
        },
        disconnect: () => {
          socket.disconnect();
          socket = null;
        }
      };

      resolve(socketInterface);
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      reject(error);
    }
  });
};

export default initializeWebSocket;