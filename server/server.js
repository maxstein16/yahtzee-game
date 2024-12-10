// server/server.js
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
  }
});

// Store connected players
const connectedPlayers = new Map();

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Handle player joining
  socket.on('playerJoined', (player) => {
    console.log('Player joined:', player);
    
    // Store player information
    connectedPlayers.set(socket.id, {
      socketId: socket.id,
      playerId: player.id,
      name: player.name
    });

    // Broadcast updated player list to all connected clients
    const playersList = Array.from(connectedPlayers.values());
    io.emit('playersUpdate', playersList);
  });

  // Handle chat messages
  socket.on('chatMessage', (message) => {
    // Get sender info
    const sender = connectedPlayers.get(socket.id);
    if (!sender) return;

    // Broadcast message to all connected clients
    const formattedMessage = {
      ...message,
      sender: sender.name,
      timestamp: new Date().toISOString()
    };
    
    io.emit('chatMessage', formattedMessage);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    // Remove player from connected players
    connectedPlayers.delete(socket.id);

    // Broadcast updated player list
    const playersList = Array.from(connectedPlayers.values());
    io.emit('playersUpdate', playersList);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});