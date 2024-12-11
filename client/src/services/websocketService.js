import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

// Centralized user management
const users = {
  socket: {},    // Socket instances by socket ID
  info: {}       // User info by player ID
};

let socket = null;

export const initializeWebSocket = (playerId, name) => {
  if (!socket) {
    socket = io(WS_BASE_URL, {
      query: { playerId, name },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      
      // Store socket info in centralized management
      users.socket[socket.id] = playerId;
      users.socket[socket.name] = name;
      users.info[playerId] = {
        id: playerId,
        name: name,
        socketId: socket.id
      };

      socket.emit('playerJoined', { id: playerId, name: name });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      
      // Clean up user data on disconnect
      if (users.socket[socket.id]) {
        const playerId = users.socket[socket.id];
        delete users.info[playerId];
        delete users.socket[socket.id];
      }
    });
  }

  return socket;
};

export const sendToUser = (playerId, type, data) => {
  if (users.info[playerId]) {
    socket.emit(type, {
      targetId: playerId,
      ...data
    });
  }
};

export const disconnectWebSocket = () => {
  if (socket) {
    // Clean up user data
    if (users.socket[socket.id]) {
      const playerId = users.socket[socket.id];
      delete users.info[playerId];
      delete users.socket[socket.id];
    }
    
    socket.disconnect();
    socket = null;
  }
};

export const getWebSocket = () => socket;

export const getUserInfo = (playerId) => users.info[playerId];

export const getConnectedUsers = () => Object.values(users.info);