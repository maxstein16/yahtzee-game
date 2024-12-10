// server/server.js
const http = require('http');
const { app } = require('./app');
const { Server } = require('socket.io');

const port = process.env.PORT || 8080;
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Track connected players
const connectedPlayers = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Handle player joining
  socket.on('playerJoined', (playerData) => {
    const { id, name } = playerData;
    console.log('Player joined:', name, id);

    // Store player information
    connectedPlayers.set(socket.id, {
      id,
      name,
      socketId: socket.id
    });

    // Broadcast updated player list to all clients
    const players = Array.from(connectedPlayers.values());
    io.emit('playersUpdate', players);
  });

  // Handle chat messages
  socket.on('chatMessage', (messageData) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    const messageToSend = {
      sender: player.name,
      content: messageData.content,
      timestamp: new Date().toISOString()
    };

    // Broadcast message to all clients
    io.emit('chatMessage', messageToSend);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const player = connectedPlayers.get(socket.id);
    if (player) {
      console.log('Player disconnected:', player.name);
      connectedPlayers.delete(socket.id);
      
      // Broadcast updated player list
      const players = Array.from(connectedPlayers.values());
      io.emit('playersUpdate', players);
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});