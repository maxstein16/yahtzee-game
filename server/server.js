// server.js
const http = require('http');
const { app } = require('./app');
const { Server } = require('socket.io');

const port = process.env.PORT || 8080;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Simple player tracking
const connectedPlayers = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  
  // Handle chat messages only
  socket.on('chatMessage', (messageData) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    const messageToSend = {
      content: messageData.content,
      sender: player.name,
      timestamp: new Date().toISOString()
    };

    // Broadcast message to all clients
    io.emit('chatMessage', messageToSend);
  });

  // Basic player tracking
  socket.on('playerJoined', (playerData) => {
    if (playerData.id && playerData.name) {
      connectedPlayers.set(socket.id, playerData);
    }
  });

  socket.on('disconnect', () => {
    connectedPlayers.delete(socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});