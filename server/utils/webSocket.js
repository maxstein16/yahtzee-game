const chatRooms = new Map();

function initializeWebSocket(io) {
  io.on('connection', (socket) => {
    const { gameId, playerId, playerName } = socket.handshake.query;
    
    console.log(`Player ${playerName} (${playerId}) connected to game ${gameId}`);
    
    // Create a unique room name for this game
    const roomName = `game:${gameId}`;
    socket.join(roomName);
    
    // Initialize chat room if it doesn't exist
    if (!chatRooms.has(gameId)) {
      chatRooms.set(gameId, {
        messages: [],
        participants: new Map()
      });
    }
    
    const room = chatRooms.get(gameId);
    room.participants.set(playerId, { name: playerName, socketId: socket.id });
    
    // Send chat history to the new user
    socket.emit('chat_history', room.messages);

    // Handle new chat messages
    socket.on('chat_message', (message) => {
      console.log('Received message:', message);
      
      const enhancedMessage = {
        ...message,
        timestamp: new Date().toISOString()
      };
      
      // Store message in room history
      room.messages.push(enhancedMessage);
      
      // Broadcast to ALL clients in the room (including sender)
      io.to(roomName).emit('chat_message', enhancedMessage);
      
      console.log(`Broadcasted message to room ${roomName}:`, enhancedMessage);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Player ${playerName} disconnected from game ${gameId}`);
      room.participants.delete(playerId);
      
      if (room.participants.size === 0) {
        chatRooms.delete(gameId);
      }
    });
  });
}