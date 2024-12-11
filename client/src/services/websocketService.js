import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

let socket = null;

export const initializeWebSocket = (playerId) => {
  if (!socket) {
    socket = io(WS_BASE_URL, {
      query: { playerId },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket.emit('playerJoined', { id: playerId });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }

  return socket;
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getWebSocket = () => socket;