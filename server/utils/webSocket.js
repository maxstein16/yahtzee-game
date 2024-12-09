// server/websocket.js
const messages = new Map(); // Store messages per game

function initializeWebSocket(io) {
  io.on('connection', (socket) => {
    const { gameId, playerId, playerName } = socket.handshake.query;
    
    console.log(`Player ${playerName} (${playerId}) connected to game ${gameId}`);
    
    socket.join(`game:${gameId}`);
    
    // Send message history when requested
    socket.on('get_messages', () => {
      const gameMessages = messages.get(gameId) || [];
      socket.emit('chat_history', gameMessages);
    });

    // Handle chat messages
    socket.on('chat_message', (message) => {
      // Store message
      if (!messages.has(gameId)) {
        messages.set(gameId, []);
      }
      const gameMessages = messages.get(gameId);
      gameMessages.push(message);
      
      // Only keep last 100 messages
      if (gameMessages.length > 100) {
        gameMessages.shift();
      }
      
      // Broadcast to all players in the game
      io.to(`game:${gameId}`).emit('chat_message', message);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Player ${playerName} (${playerId}) disconnected from game ${gameId}`);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', 'An error occurred');
    });
  });
}

module.exports = { initializeWebSocket };