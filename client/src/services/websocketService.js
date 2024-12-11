import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

export const initializeWebSocket = (playerId) => {
  // Use a singleton pattern to prevent multiple connections
  if (initializeWebSocket.socket && initializeWebSocket.socket.connected) {
    return Promise.resolve(initializeWebSocket.socket);
  }

  return new Promise((resolve, reject) => {
    try {
      // Enhanced socket configuration
      const socket = io(WS_BASE_URL, {
        query: { playerId },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        autoConnect: true,
        forceNew: false,
        multiplex: false
      });

      // Track initial connection
      let initialConnection = true;
      const connectionTimeout = setTimeout(() => {
        if (initialConnection) {
          socket.disconnect();
          reject(new Error('Initial connection timeout'));
        }
      }, 20000);

      socket.on('connect', () => {
        if (initialConnection) {
          console.log('WebSocket connected successfully');
          clearTimeout(connectionTimeout);
          initialConnection = false;

          // Only identify player on initial connection
          socket.emit('playerJoined', {
            id: playerId,
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        if (initialConnection) {
          reject(error);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        // Only reconnect for specific disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          socket.connect();
        }
      });

      // Store socket instance
      initializeWebSocket.socket = socket;

      // Return enhanced socket interface
      resolve({
        emit: (event, data) => socket.emit(event, data),
        on: (event, callback) => socket.on(event, callback),
        off: (event) => socket.off(event),
        disconnect: () => {
          clearTimeout(connectionTimeout);
          socket.disconnect();
          initializeWebSocket.socket = null;
        },
        getState: () => ({
          connected: socket.connected,
          connecting: socket.connecting
        })
      });

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      reject(error);
    }
  });
};

initializeWebSocket.socket = null;

export default initializeWebSocket;