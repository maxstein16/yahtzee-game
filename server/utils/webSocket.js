// server/websocket.js
const { Server } = require('socket.io');

function initializeWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        'https://yahtzee.maxstein.info',
        'http://localhost:3000'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io'
  });

  // Store active game rooms
  const gameRooms = new Map();

  io.on('connection', (socket) => {
    const { gameId, playerId } = socket.handshake.query;
    
    console.log(`Player ${playerId} connected to game ${gameId}`);
    
    // Join game room
    socket.join(`game:${gameId}`);
    
    // Track players in game
    if (!gameRooms.has(gameId)) {
      gameRooms.set(gameId, new Set());
    }
    gameRooms.get(gameId).add(playerId);

    // Broadcast player joined
    io.to(`game:${gameId}`).emit('player_joined', {
      playerId,
      playerCount: gameRooms.get(gameId).size
    });

    // Handle chat messages
    socket.on('chat_message', (message) => {
      io.to(`game:${gameId}`).emit('chat_message', {
        ...message,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Player ${playerId} disconnected from game ${gameId}`);
      
      const gameRoom = gameRooms.get(gameId);
      if (gameRoom) {
        gameRoom.delete(playerId);
        if (gameRoom.size === 0) {
          gameRooms.delete(gameId);
        }
      }

      io.to(`game:${gameId}`).emit('player_left', {
        playerId,
        playerCount: gameRoom ? gameRoom.size : 0
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', 'An error occurred');
    });
  });

  return io;
}

module.exports = { initializeWebSocket };