import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

export const initializeWebSocket = (gameId, playerId) => {
  return new Promise((resolve, reject) => {
    try {
      // Connect to WebSocket with game and player context
      const socket = io(WS_BASE_URL, {
        query: { 
          gameId, 
          playerId 
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection success handler
      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        resolve({
          on: (event, callback) => socket.on(event, callback),
          emit: (event, data) => socket.emit(event, data),
          disconnect: () => socket.disconnect()
        });
      });

      // Connection error handler
      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

export default initializeWebSocket;