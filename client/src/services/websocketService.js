// src/services/websocketService.js
import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

export const initializeWebSocket = (playerId, playerName) => {
  return new Promise((resolve, reject) => {
    try {
      const socket = io(WS_BASE_URL, {
        path: '/socket.io',
        query: { 
          playerId,
          playerName
        },
        transports: ['websocket', 'polling'], // Allow fallback to polling
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000, // Increase timeout
        forceNew: true,
        withCredentials: true, // Enable CORS credentials
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          socket.connect();
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      });

      socket.on('reconnect_error', (error) => {
        console.error('WebSocket reconnection error:', error);
      });

      socket.on('reconnect_failed', () => {
        console.error('WebSocket reconnection failed');
        reject(new Error('Failed to reconnect to server'));
      });

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      reject(error);
    }
  });
};

export default initializeWebSocket;