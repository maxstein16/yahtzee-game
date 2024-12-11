import io from 'socket.io-client';

const WS_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'wss://yahtzee-backend-621359075899.us-east1.run.app:443'
  : 'ws://localhost:8080';

export const initializeWebSocket = (playerId) => {
  return new Promise((resolve, reject) => {
    try {
      // Create socket connection with auth data
      const socket = io(WS_BASE_URL, {
        path: '/socket.io',
        query: { playerId },
        transports: ['polling', 'websocket'],
        secure: true, // Enable secure connection
        rejectUnauthorized: false, // Required for self-signed certs
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        forceNew: true,
        withCredentials: true
      });

      // Handle connection success
      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        
        // Immediately identify the player to the server
        socket.emit('playerJoined', {
          id: playerId,
          timestamp: new Date().toISOString()
        });
      });

      // Handle connection error
      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      // Return socket interface
      resolve({
        // Basic socket methods
        emit: (event, data) => socket.emit(event, data),
        on: (event, callback) => socket.on(event, callback),
        off: (event) => socket.off(event),
        disconnect: () => socket.disconnect(),

        // Helper methods
        sendMessage: (message) => {
          socket.emit('chatMessage', {
            content: message,
            timestamp: new Date().toISOString()
          });
        },

        // Get socket state
        isConnected: () => socket.connected
      });

    } catch (error) {
      reject(error);
    }
  });
};

export default initializeWebSocket;