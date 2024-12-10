const chatRooms = new Map();

function initializeWebSocket(io) {
  io.on('connection', (socket) => {
    const { gameId, playerId, playerName } = socket.handshake.query;
    
    // Join the game's room
    socket.join(`game:${gameId}`);
    
    // Initialize or get chat room
    if (!chatRooms.has(gameId)) {
      chatRooms.set(gameId, {
        messages: [],
        participants: new Map()
      });
    }
    const room = chatRooms.get(gameId);
    
    // Add participant
    room.participants.set(playerId, {
      name: playerName,
      socketId: socket.id
    });

    // Send existing messages to newly connected user
    socket.emit('chat_history', room.messages);

    // Broadcast new messages to ALL clients in the room
    socket.on('chat_message', (message) => {
      console.log(`Broadcasting message in game ${gameId}:`, message);
      
      const enhancedMessage = {
        ...message,
        id: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      // Store message
      room.messages.push(enhancedMessage);
      
      // Broadcast to ALL clients in the room (including sender)
      io.to(`game:${gameId}`).emit('chat_message', enhancedMessage);
    });

    socket.on('disconnect', () => {
      room.participants.delete(playerId);
      if (room.participants.size === 0) {
        chatRooms.delete(gameId);
      }
      
      io.to(`game:${gameId}`).emit('player_left', {
        playerId,
        playerName
      });
    });
  });
}