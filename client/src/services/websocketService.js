import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';
const HEARTBEAT_INTERVAL = 25000; // 25 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds timeout for heartbeat response

export const initializeWebSocket = (playerId) => {
  return new Promise((resolve, reject) => {
    try {
      let heartbeatInterval = null;
      let heartbeatTimeout = null;
      let missedHeartbeats = 0;
      const MAX_MISSED_HEARTBEATS = 2;

      const socket = io(WS_BASE_URL, {
        query: { playerId },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        withCredentials: true,
        extraHeaders: {
          'Access-Control-Allow-Credentials': 'true'
        }
      });

      const startHeartbeat = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }

        heartbeatInterval = setInterval(() => {
          if (!socket.connected) return;

          // Clear any existing timeout
          if (heartbeatTimeout) {
            clearTimeout(heartbeatTimeout);
          }

          // Set timeout for heartbeat response
          heartbeatTimeout = setTimeout(() => {
            missedHeartbeats++;
            console.log(`Missed heartbeat (${missedHeartbeats}/${MAX_MISSED_HEARTBEATS})`);

            if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
              console.log('Missed too many heartbeats, reconnecting...');
              socket.disconnect();
              socket.connect();
            }
          }, HEARTBEAT_TIMEOUT);

          // Send heartbeat
          socket.emit('ping', null, () => {
            if (heartbeatTimeout) {
              clearTimeout(heartbeatTimeout);
              heartbeatTimeout = null;
            }
            missedHeartbeats = 0;
          });
        }, HEARTBEAT_INTERVAL);
      };

      const stopHeartbeat = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        if (heartbeatTimeout) {
          clearTimeout(heartbeatTimeout);
          heartbeatTimeout = null;
        }
      };

      // Connection event handlers
      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        missedHeartbeats = 0;
        startHeartbeat();

        socket.emit('playerJoined', {
          id: playerId,
          name: localStorage.getItem('playerName') || 'Player',
          timestamp: new Date().toISOString()
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        stopHeartbeat();
        
        if (reason === 'io server disconnect') {
          setTimeout(() => {
            socket.connect();
          }, 1000);
        }
      });

      socket.on('reconnecting', (attemptNumber) => {
        console.log(`Attempting to reconnect (${attemptNumber})...`);
      });

      socket.on('reconnect', () => {
        console.log('Successfully reconnected');
        missedHeartbeats = 0;
        startHeartbeat();
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Server heartbeat response
      socket.on('pong', () => {
        if (heartbeatTimeout) {
          clearTimeout(heartbeatTimeout);
          heartbeatTimeout = null;
        }
        missedHeartbeats = 0;
      });

      // Enhanced socket interface
      const enhancedSocket = {
        emit: (event, data) => {
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
        },

        on: (event, callback) => socket.on(event, callback),
        off: (event) => socket.off(event),

        disconnect: () => {
          stopHeartbeat();
          socket.disconnect();
        },

        reconnect: () => {
          stopHeartbeat();
          socket.disconnect();
          socket.connect();
        },

        getState: () => ({
          connected: socket.connected,
          connecting: socket.connecting,
          disconnected: socket.disconnected
        }),

        isConnected: () => socket.connected
      };

      resolve(enhancedSocket);

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      reject(error);
    }
  });
};

export default initializeWebSocket;