import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

// Single global socket instance
let globalSocket = null;
let isInitializing = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const initializeWebSocket = (playerId) => {
  // Return existing connection if valid
  if (globalSocket?.connected) {
    return Promise.resolve(createSocketInterface(globalSocket));
  }

  // Prevent multiple simultaneous initialization attempts
  if (isInitializing) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (globalSocket?.connected) {
          clearInterval(checkInterval);
          resolve(createSocketInterface(globalSocket));
        }
      }, 100);
    });
  }

  isInitializing = true;

  return new Promise((resolve, reject) => {
    try {
      const socket = io(WS_BASE_URL, {
        query: { playerId },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        timeout: 10000,
        auth: { playerId }
      });

      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        isInitializing = false;
        reconnectAttempts = 0;
        globalSocket = socket;

        socket.emit('playerJoined', {
          id: playerId,
          timestamp: new Date().toISOString()
        });

        resolve(createSocketInterface(socket));
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reconnectAttempts++;
        
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          isInitializing = false;
          globalSocket = null;
          reject(error);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        
        if (reason === 'io server disconnect' || reason === 'transport close') {
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            socket.connect();
          } else {
            globalSocket = null;
          }
        }
      });

    } catch (error) {
      console.error('Socket initialization error:', error);
      isInitializing = false;
      reject(error);
    }
  });
};

const createSocketInterface = (socket) => ({
  emit: (event, data) => {
    return new Promise((resolve, reject) => {
      if (!socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit(event, data, (response) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  },

  on: (event, callback) => {
    socket.on(event, callback);
    return () => socket.off(event, callback);
  },

  off: (event, callback) => {
    socket.off(event, callback);
  },

  disconnect: () => {
    socket.disconnect();
    globalSocket = null;
    isInitializing = false;
    reconnectAttempts = 0;
  },

  getState: () => ({
    connected: socket.connected,
    connecting: socket.connecting
  })
});

export default initializeWebSocket;