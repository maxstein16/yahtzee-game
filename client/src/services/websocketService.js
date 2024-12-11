import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// Track global connection state
let isFirstConnection = true;
let hasLoggedError = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const initializeWebSocket = (playerId) => {
  return new Promise((resolve, reject) => {
    try {
      // Reset connection tracking on new initialization
      hasLoggedError = false;
      reconnectAttempts = 0;

      const socket = io(WS_BASE_URL, {
        query: { playerId },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: CONNECTION_TIMEOUT,
        autoConnect: true
      });

      let hasConnected = false;

      socket.on('connect', () => {
        hasConnected = true;
        hasLoggedError = false;
        reconnectAttempts = 0;

        if (isFirstConnection) {
          console.log('WebSocket connected successfully');
          isFirstConnection = false;
        }

        socket.emit('playerJoined', {
          id: playerId,
          timestamp: new Date().toISOString()
        });
      });

      socket.on('connect_error', (error) => {
        reconnectAttempts++;
        
        if (!hasLoggedError) {
          console.error('WebSocket connection error:', error);
          hasLoggedError = true;
        }

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          socket.disconnect();
          reject(new Error('Maximum reconnection attempts reached'));
        }
      });

      // Enhanced socket interface with both Promise and regular emit support
      const enhancedSocket = {
        emit: (event, data, callback) => {
          if (callback) {
            // Regular emit with callback
            if (!socket.connected) {
              callback({ error: 'Socket is not connected' });
              return;
            }
            socket.emit(event, data, callback);
          } else {
            // Promise-based emit
            return new Promise((resolveEmit, rejectEmit) => {
              if (!socket.connected) {
                rejectEmit(new Error('Socket is not connected'));
                return;
              }

              socket.emit(event, data, (acknowledgement) => {
                if (acknowledgement?.error) {
                  rejectEmit(new Error(acknowledgement.error));
                } else {
                  resolveEmit(acknowledgement);
                }
              });
            });
          }
        },

        // Direct access to underlying socket's emit
        rawEmit: (...args) => socket.emit(...args),

        on: (event, callback) => {
          if (event === 'connect') {
            socket.on(event, () => {
              if (!hasConnected) {
                callback();
                hasConnected = true;
              }
            });
          } else {
            socket.on(event, callback);
          }
        },

        off: (event) => socket.off(event),

        disconnect: () => {
          isFirstConnection = true;
          socket.disconnect();
        },

        reconnect: () => {
          if (!socket.connected && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            socket.connect();
          }
        },

        getState: () => ({
          connected: socket.connected,
          connecting: socket.connecting,
          disconnected: socket.disconnected,
          reconnectAttempts
        })
      };

      const connectionTimeout = setTimeout(() => {
        if (!hasConnected) {
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }
      }, CONNECTION_TIMEOUT);

      socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        resolve(enhancedSocket);
      });

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      reject(error);
    }
  });
};

export default initializeWebSocket;