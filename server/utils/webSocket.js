const chatRooms = new Map();

function initializeWebSocket(io) {
  io.on('connection', (socket) => {
    const { gameId, playerId, playerName } = socket.handshake.query;
    
    // Debug connection
    console.log(`[WebSocket] New connection:`, {
      gameId,
      playerId,
      playerName,
      socketId: socket.id
    });
    
    // Join game room
    const roomName = `game:${gameId}`;
    socket.join(roomName);
    
    console.log(`[WebSocket] Player joined room:`, {
      room: roomName,
      playerId,
      socketId: socket.id
    });
    
    // Initialize or get chat room
    if (!chatRooms.has(gameId)) {
      chatRooms.set(gameId, {
        messages: [],
        participants: new Map()
      });
      console.log(`[WebSocket] Created new chat room for game:`, gameId);
    }
    
    const room = chatRooms.get(gameId);
    room.participants.set(playerId, {
      name: playerName,
      socketId: socket.id
    });
    
    // Log room participants
    console.log(`[WebSocket] Room participants:`, {
      gameId,
      participants: Array.from(room.participants.entries())
    });

    // Send chat history
    socket.emit('chat_history', room.messages);
    console.log(`[WebSocket] Sent chat history to player:`, {
      playerId,
      messageCount: room.messages.length
    });

    // Handle chat messages
    socket.on('chat_message', (message) => {
      const enhancedMessage = {
        ...message,
        id: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      console.log(`[WebSocket] Received message:`, {
        from: playerId,
        roomName,
        message: enhancedMessage
      });

      // Store in room history
      room.messages.push(enhancedMessage);
      
      // Get all socket IDs in the room
      const roomSockets = io.sockets.adapter.rooms.get(roomName);
      console.log(`[WebSocket] Active sockets in room:`, {
        room: roomName,
        sockets: Array.from(roomSockets || [])
      });

      // Broadcast to room
      io.in(roomName).emit('chat_message', enhancedMessage);
      console.log(`[WebSocket] Broadcasted message to room:`, {
        room: roomName,
        messageId: enhancedMessage.id
      });
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Player disconnected:`, {
        gameId,
        playerId,
        socketId: socket.id
      });
      
      room.participants.delete(playerId);
      
      if (room.participants.size === 0) {
        chatRooms.delete(gameId);
        console.log(`[WebSocket] Removed empty room:`, gameId);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`[WebSocket] Socket error:`, {
        error,
        socketId: socket.id,
        playerId
      });
    });
  });
}