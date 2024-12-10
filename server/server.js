const http = require('http');
const { app } = require('./app');
const { Server } = require('socket.io');

const port = process.env.PORT || 8080;
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 5000, // Reduce ping timeout
  pingInterval: 10000 // Reduce ping interval
});

// Store connected players with playerId as key for faster lookups
const connectedPlayers = new Map();

// Helper function to broadcast player list
const broadcastPlayerList = () => {
  const playersList = Array.from(connectedPlayers.values());
  io.emit('playersUpdate', playersList);
};

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Immediately acknowledge connection
  socket.emit('connectionAck', { connected: true });

  socket.on('playerJoined', (player) => {
    console.log('Player joined:', player);
    
    // Store player information using playerId as key
    const playerInfo = {
      socketId: socket.id,
      playerId: player.id,
      name: player.name
    };
    
    connectedPlayers.set(player.id, playerInfo);

    // Immediately send current player list to the newly connected player
    socket.emit('playersUpdate', Array.from(connectedPlayers.values()));
    
    // Then broadcast to everyone else
    socket.broadcast.emit('playersUpdate', Array.from(connectedPlayers.values()));
    
    // Broadcast new player notification
    socket.broadcast.emit('playerJoinedNotification', {
      name: player.name,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('chatMessage', (message) => {
    // Find player by socket ID
    const sender = Array.from(connectedPlayers.values()).find(p => p.socketId === socket.id);
    if (!sender) return;

    const formattedMessage = {
      ...message,
      sender: sender.name,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast immediately
    io.emit('chatMessage', formattedMessage);
  });

  socket.on('disconnect', () => {
    // Find and remove the disconnected player
    const disconnectedPlayer = Array.from(connectedPlayers.values()).find(p => p.socketId === socket.id);
    if (disconnectedPlayer) {
      connectedPlayers.delete(disconnectedPlayer.playerId);
      
      // Broadcast updated list and disconnection notification
      broadcastPlayerList();
      socket.broadcast.emit('playerLeftNotification', {
        name: disconnectedPlayer.name,
        timestamp: new Date().toISOString()
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});