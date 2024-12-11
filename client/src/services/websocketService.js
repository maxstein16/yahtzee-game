import io from 'socket.io-client';

const WS_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://yahtzee-backend-621359075899.us-east1.run.app'
  : 'http://localhost:8080';

export const initializeWebSocket = (playerId) => {
  return new Promise((resolve, reject) => {
    try {
      const socket = io(WS_BASE_URL, {
        query: { playerId },
        transports: ['polling', 'websocket'],
        secure: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        forceNew: true,
        withCredentials: true,
        autoConnect: true
      });

      socket.io.on("error", (error) => {
        console.log("Socket.io error:", error);
      });

      socket.io.on("reconnect_attempt", (attempt) => {
        console.log("Reconnection attempt:", attempt);
      });

      // Handle connection success
      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        
        // Immediately identify the player to the server
        socket.emit('playerJoined', {
          id: playerId,
          timestamp: new Date().toISOString()
        });
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
          isConnected: () => socket.connected
        });
      });

      // Handle connection error with more detail
      socket.on('connect_error', (error) => {
        console.error('Connection error details:', {
          message: error.message,
          description: error.description,
          type: error.type,
          context: error.context
        });
        
        // Fallback to polling if websocket fails
        if (socket.io.opts.transports[0] === 'websocket') {
          console.log('Falling back to polling...');
          socket.io.opts.transports = ['polling'];
        }
        reject(error);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
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