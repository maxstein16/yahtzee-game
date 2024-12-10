// src/services/websocketService.js
import io from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

export const initializeWebSocket = (playerId, playerName) => {
  return new Promise((resolve, reject) => {
    try {
      const socket = io(WS_BASE_URL, {
        query: { 
          playerId,
          playerName
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Basic connection events
      socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        socket.emit('playerConnected', { playerId, playerName });
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      // Game-specific events
      socket.on('gameStarted', (gameData) => {
        console.log('Game started:', gameData);
      });

      socket.on('playerTurn', (turnData) => {
        console.log('Player turn:', turnData);
      });

      socket.on('gameEnded', (gameData) => {
        console.log('Game ended:', gameData);
      });

      // Create a wrapper with common socket methods
      const socketWrapper = {
        // Basic socket methods
        emit: (event, data) => socket.emit(event, data),
        on: (event, callback) => socket.on(event, callback),
        off: (event, callback) => socket.off(event, callback),
        disconnect: () => socket.disconnect(),

        // Game-specific methods
        sendRoll: (gameId, dice) => {
          socket.emit('diceRoll', { gameId, dice });
        },
        
        submitScore: (gameId, category, score) => {
          socket.emit('submitScore', { gameId, category, score });
        },
        
        // Player management
        getConnectedPlayers: () => {
          socket.emit('getConnectedPlayers');
        },
        
        sendGameRequest: (toPlayerId) => {
          socket.emit('sendGameRequest', { toPlayerId });
        },
        
        respondToGameRequest: (requestId, accepted) => {
          socket.emit('respondToGameRequest', { requestId, accepted });
        }
      };

      resolve(socketWrapper);
    } catch (error) {
      reject(error);
    }
  });
};

export default initializeWebSocket;