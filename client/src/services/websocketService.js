import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

export const initializeWebSocket = (gameId, playerId) => {
  return new Promise((resolve, reject) => {
    try {
      const socket = io(WS_BASE_URL, {
        query: { 
          gameId, 
          playerId 
        },
        transports: ['websocket'], // Ensure only WebSocket transport is used
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        resolve({
          on: (event, callback) => socket.on(event, callback),
          off: (event, callback) => socket.off(event, callback), // Add this
          emit: (event, data) => socket.emit(event, data),
          disconnect: () => socket.disconnect(),
        });
      });

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
