// server/websocket.js
const messages = new Map();
const activeUsers = new Map(); // Track active users per game

function initializeWebSocket(io) {
  io.on('connection', (socket) => {
    const { gameId, playerId, playerName } = socket.handshake.query;
    
    console.log(`Player ${playerName} (${playerId}) connected to game ${gameId}`);
    
    // Add user to active users for this game
    if (!activeUsers.has(gameId)) {
      activeUsers.set(gameId, new Map());
    }
    activeUsers.get(gameId).set(playerId, { playerName, socketId: socket.id });
    
    // Join game room
    socket.join(`game:${gameId}`);
    
    // Notify others that a player joined
    io.in(`game:${gameId}`).emit('player_joined', {
      playerId,
      playerName,
      timestamp: new Date().toISOString()
    });
    
    // Send chat history to the newly connected client
    const gameMessages = messages.get(gameId) || [];
    socket.emit('chat_history', gameMessages);
    
    // Handle chat messages
    socket.on('chat_message', (message) => {
      console.log('Received message:', message); // Debug log
      
      // Ensure message has all required fields
      const enhancedMessage = {
        ...message,
        playerName, // Ensure playerName is included
        timestamp: new Date().toISOString()
      };
      
      // Store message
      if (!messages.has(gameId)) {
        messages.set(gameId, []);
      }
      messages.get(gameId).push(enhancedMessage);
      
      // Broadcast to all clients in the game room, including sender
      io.in(`game:${gameId}`).emit('chat_message', enhancedMessage);
      
      console.log('Broadcasted message to room:', `game:${gameId}`); // Debug log
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Player ${playerName} (${playerId}) disconnected from game ${gameId}`);
      
      // Remove user from active users
      if (activeUsers.has(gameId)) {
        activeUsers.get(gameId).delete(playerId);
        if (activeUsers.get(gameId).size === 0) {
          activeUsers.delete(gameId);
        }
      }
      
      // Notify others that player left
      io.in(`game:${gameId}`).emit('player_left', {
        playerId,
        playerName,
        timestamp: new Date().toISOString()
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', 'An error occurred');
    });
  });
}

module.exports = { initializeWebSocket };