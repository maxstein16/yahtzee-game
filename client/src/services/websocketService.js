import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

let globalSocket = null;

export const initializeWebSocket = (playerId) => {
  // Return existing connection if valid
  if (globalSocket?.connected) {
    return Promise.resolve(globalSocket);
  }

  return new Promise((resolve, reject) => {
    try {
      // Configure socket
      const socket = io(WS_BASE_URL, {
        query: { playerId },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        auth: { playerId }
      });

      // Connection management
      let isConnected = false;

      socket.on('connect', () => {
        console.log('WebSocket connected');
        isConnected = true;

        socket.emit('playerJoined', {
          id: playerId,
          timestamp: new Date().toISOString()
        });

        // Store global reference
        globalSocket = socket;
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        if (!isConnected) {
          reject(error);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        isConnected = false;

        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      // Create socket interface
      const socketInterface = {
        emit: (event, data) => {
          return new Promise((resolveEmit, rejectEmit) => {
            if (!socket.connected) {
              rejectEmit(new Error('Socket not connected'));
              return;
            }

            try {
              socket.emit(event, data, (response) => {
                if (response?.error) {
                  rejectEmit(new Error(response.error));
                } else {
                  resolveEmit(response);
                }
              });
            } catch (error) {
              rejectEmit(error);
            }
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
        },

        reconnect: () => {
          if (!socket.connected) {
            socket.connect();
          }
        },

        getState: () => ({
          connected: socket.connected,
          connecting: socket.connecting
        })
      };

      socket.on('connect', () => resolve(socketInterface));
      socket.on('connect_error', (error) => {
        if (!isConnected) {
          reject(error);
        }
      });

    } catch (error) {
      console.error('Socket initialization error:', error);
      reject(error);
    }
  });
};

export default initializeWebSocket;