// server/webSocket.js
const chatRooms = new Map();

function initializeWebSocket(io) {
  // Log all rooms periodically for debugging
  setInterval(() => {
    console.log('Current rooms:', io.sockets.adapter.rooms);
  }, 5000);

  io.on('connection', async (socket) => {
    const { gameId, playerId, playerName } = socket.handshake.query;
    const roomId = `game:${gameId}`;

    // Join the room
    await socket.join(roomId);
    
    // Log room join
    console.log(`Player ${playerName} (${playerId}) joined room ${roomId}`);
    console.log('Rooms:', Array.from(socket.rooms));
    
    // Initialize room if needed
    if (!chatRooms.has(gameId)) {
      chatRooms.set(gameId, {
        messages: [],
        participants: new Map()
      });
    }
    
    const room = chatRooms.get(gameId);
    room.participants.set(playerId, {
      socketId: socket.id,
      name: playerName
    });

    // Send existing messages to new participant
    if (room.messages.length > 0) {
      socket.emit('chat_history', room.messages);
    }

    // Log current room state
    console.log(`Room ${roomId} participants:`, 
      Array.from(room.participants.values()).map(p => p.name)
    );

    socket.on('chat_message', (message) => {
      console.log(`Received message in ${roomId}:`, message);
      
      // Enhance message with timestamp and ID
      const enhancedMessage = {
        ...message,
        timestamp: new Date().toISOString(),
        messageId: Date.now()
      };

      // Store message
      room.messages.push(enhancedMessage);

      // Broadcast to ALL clients in the room
      io.in(roomId).emit('chat_message', enhancedMessage);
      
      // Log broadcast
      console.log(`Broadcasting to room ${roomId}. Connected sockets:`, 
        io.sockets.adapter.rooms.get(roomId)?.size
      );
    });

    // Handle disconnects
    socket.on('disconnect', () => {
      console.log(`Player ${playerName} disconnected from ${roomId}`);
      room.participants.delete(playerId);
      
      // Clean up empty rooms
      if (room.participants.size === 0) {
        chatRooms.delete(gameId);
        console.log(`Removed empty room ${roomId}`);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'Internal socket error' });
    });
  });
}

// Add heartbeat to keep connections alive
function setupHeartbeat(io) {
  setInterval(() => {
    io.emit('ping');
  }, 25000);
}

module.exports = { 
  initializeWebSocket,
  setupHeartbeat
};