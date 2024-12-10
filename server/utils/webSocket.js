const messages = new Map();
const activeUsers = new Map(); // Track active users per game

function initializeWebSocket(io) {
  io.on('connection', (socket) => {
    const { gameId, playerId, playerName } = socket.handshake.query;

    console.log(`Player ${playerName} (${playerId}) connected to game ${gameId}`);

    if (!activeUsers.has(gameId)) {
      activeUsers.set(gameId, new Map());
    }
    activeUsers.get(gameId).set(playerId, { playerName, socketId: socket.id });

    socket.join(`game:${gameId}`);

    io.in(`game:${gameId}`).emit('player_joined', {
      playerId,
      playerName,
      timestamp: new Date().toISOString(),
    });

    const gameMessages = messages.get(gameId) || [];
    socket.emit('chat_history', gameMessages);

    socket.on('chat_message', (message) => {
      const enhancedMessage = {
        ...message,
        playerName,
        timestamp: new Date().toISOString(),
      };

      if (!messages.has(gameId)) {
        messages.set(gameId, []);
      }
      messages.get(gameId).push(enhancedMessage);

      io.in(`game:${gameId}`).emit('chat_message', enhancedMessage);
    });

    socket.on('disconnect', () => {
      activeUsers.get(gameId).delete(playerId);
      if (activeUsers.get(gameId).size === 0) {
        activeUsers.delete(gameId);
      }

      io.in(`game:${gameId}`).emit('player_left', {
        playerId,
        playerName,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', 'An error occurred');
    });
  });
}

module.exports = { initializeWebSocket };
