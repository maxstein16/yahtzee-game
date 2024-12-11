import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

export const initializeWebSocket = (playerId) => {
  return new Promise((resolve, reject) => {
    try {
      const socket = io(WS_BASE_URL, {
        query: { playerId },
        transports: ['websocket', 'polling'], // Match server configuration
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 60000, // Match server timeout
        forceNew: true, // Force a new connection
        withCredentials: true // Enable CORS credentials
      });

      // Add connection status logging
      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        socket.emit('playerJoined', {
          id: playerId,
          name: playerData?.name, // Make sure to pass player name
          timestamp: new Date().toISOString()
        });
      });

      socket.on('connect_error', (error) => {
        console.error('Connection Error:', error);
        reject(error);
      });

      socket.on('error', (error) => {
        console.error('Socket Error:', error);
      });

      // Update app.js CORS configuration
      const corsOptions = {
        origin: [
          'https://yahtzee.maxstein.info',
          'http://localhost:3000'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 86400,
        exposedHeaders: ['set-cookie'] // Allow cookies if needed
      };

      // Return enhanced socket interface
      resolve({
        emit: (event, data) => socket.emit(event, data),
        on: (event, callback) => socket.on(event, callback),
        off: (event) => socket.off(event),
        disconnect: () => socket.disconnect(),
        sendMessage: (message) => {
          socket.emit('chatMessage', {
            content: message,
            timestamp: new Date().toISOString()
          });
        },
        isConnected: () => socket.connected,
        // Add reconnection method
        reconnect: () => {
          socket.connect();
        }
      });

    } catch (error) {
      console.error('Socket initialization error:', error);
      reject(error);
    }
  });
};

export default initializeWebSocket;