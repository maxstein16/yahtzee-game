const chatRooms = new Map(); // Store chat rooms and their messages

function initializeWebSocket(io) {
  io.on('connection', (socket) => {
    const { gameId, playerId, playerName } = socket.handshake.query;
    
    console.log(`Player ${playerName} (${playerId}) connected to game ${gameId}`);
    
    // Join chat room for this game
    socket.join(`game:${gameId}`);
    
    // Initialize chat room if it doesn't exist
    if (!chatRooms.has(gameId)) {
      chatRooms.set(gameId, {
        messages: [],
        participants: new Map()
      });
    }

    // Add player to participants
    const room = chatRooms.get(gameId);
    room.participants.set(playerId, {
      name: playerName,
      socketId: socket.id
    });
    
    // Send chat history to newly connected player
    socket.emit('chat_history', room.messages);
    
    // Notify room about new player
    io.to(`game:${gameId}`).emit('player_joined', {
      playerId,
      playerName,
      timestamp: new Date().toISOString()
    });

    // Handle new messages
    socket.on('chat_message', (message) => {
      const enhancedMessage = {
        ...message,
        messageId: Date.now(), // Add unique ID for message
        timestamp: new Date().toISOString()
      };
      
      // Store message in room history
      room.messages.push(enhancedMessage);
      
      // Broadcast to all clients in the room, including sender
      io.to(`game:${gameId}`).emit('chat_message', enhancedMessage);
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log(`Player ${playerName} disconnected from game ${gameId}`);
      
      // Remove player from participants
      room.participants.delete(playerId);
      
      // Remove room if empty
      if (room.participants.size === 0) {
        chatRooms.delete(gameId);
      }
      
      // Notify room about player leaving
      io.to(`game:${gameId}`).emit('player_left', {
        playerId,
        playerName,
        timestamp: new Date().toISOString()
      });
    });
  });
}

module.exports = { initializeWebSocket };