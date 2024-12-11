import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

export const initializeWebSocket = (playerId) => {
  return new Promise((resolve, reject) => {
    try {
      // Enhanced socket configuration
      const socket = io(WS_BASE_URL, {
        query: { playerId },
        transports: ['websocket', 'polling'], // Fall back to polling if WebSocket fails
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        withCredentials: true,
        extraHeaders: {
          'Access-Control-Allow-Credentials': 'true'
        }
      });

      // Track connection state
      let isConnecting = true;
      const connectionTimeout = setTimeout(() => {
        if (isConnecting) {
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }
      }, 20000);

      // Handle successful connection
      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        isConnecting = false;
        clearTimeout(connectionTimeout);

        // Identify player to server with retry logic
        const identifyPlayer = () => {
          socket.emit('playerJoined', {
            id: playerId,
            timestamp: new Date().toISOString()
          }, (acknowledgement) => {
            if (!acknowledgement) {
              setTimeout(identifyPlayer, 1000); // Retry if no acknowledgement
            }
          });
        };
        identifyPlayer();
      });

      // Enhanced error handling
      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        if (error.message.includes('CORS')) {
          reject(new Error('CORS error - Please check server configuration'));
        } else if (error.message.includes('timeout')) {
          reject(new Error('Connection timed out - Please check your internet connection'));
        } else {
          reject(new Error(`Connection failed: ${error.message}`));
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Reconnect if server initiated disconnect
          socket.connect();
        }
      });

      // Handle reconnection attempts
      socket.on('reconnecting', (attemptNumber) => {
        console.log(`Attempting to reconnect... (${attemptNumber})`);
      });

      // Handle successful reconnection
      socket.on('reconnect', (attemptNumber) => {
        console.log(`Successfully reconnected after ${attemptNumber} attempts`);
        // Re-identify player after reconnection
        socket.emit('playerJoined', {
          id: playerId,
          timestamp: new Date().toISOString()
        });
      });

      // Return enhanced socket interface
      resolve({
        // Basic socket methods
        emit: (event, data) => {
          return new Promise((resolveEmit, rejectEmit) => {
            socket.emit(event, data, (acknowledgement) => {
              if (acknowledgement?.error) {
                rejectEmit(new Error(acknowledgement.error));
              } else {
                resolveEmit(acknowledgement);
              }
            });
          });
        },
        on: (event, callback) => socket.on(event, callback),
        off: (event) => socket.off(event),
        disconnect: () => {
          clearTimeout(connectionTimeout);
          socket.disconnect();
        },

        // Enhanced helper methods
        sendMessage: async (message) => {
          try {
            await new Promise((resolveMessage, rejectMessage) => {
              socket.emit('chatMessage', {
                content: message,
                timestamp: new Date().toISOString()
              }, (acknowledgement) => {
                if (acknowledgement?.error) {
                  rejectMessage(new Error(acknowledgement.error));
                } else {
                  resolveMessage(acknowledgement);
                }
              });
            });
          } catch (error) {
            console.error('Error sending message:', error);
            throw error;
          }
        },

        // Enhanced connection state
        getState: () => ({
          connected: socket.connected,
          connecting: socket.connecting,
          disconnected: socket.disconnected,
          reconnecting: socket.reconnecting
        }),

        // Force reconnection
        reconnect: () => {
          socket.disconnect();
          socket.connect();
        }
      });

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      reject(error);
    }
  });
};

export default initializeWebSocket;