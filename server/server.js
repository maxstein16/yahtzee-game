// In server.js
const http = require('http');
const { Server } = require('socket.io');
const { app } = require('./app');

const server = http.createServer(app);
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
    console.log('Player joined:', playerData);
    connectedPlayers.set(socket.id, {
      ...playerData,
      socketId: socket.id
    });
    
    // Broadcast updated players list to all connected clients
    io.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });

  // Handle get players request
  socket.on('getPlayers', () => {
    socket.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });

  // Handle game requests
  socket.on('requestGame', (targetPlayerId) => {
    const requestingPlayer = connectedPlayers.get(socket.id);
    const targetSocket = Array.from(connectedPlayers.entries())
      .find(([_, player]) => player.id === targetPlayerId)?.[0];

    if (targetSocket) {
      io.to(targetSocket).emit('gameRequest', requestingPlayer);
    }
  });

  // Handle game request responses
  socket.on('acceptGame', (requestingPlayerId) => {
    const targetSocket = Array.from(connectedPlayers.entries())
      .find(([_, player]) => player.id === requestingPlayerId)?.[0];

    if (targetSocket) {
      io.to(targetSocket).emit('gameRequestResponse', {
        playerId: connectedPlayers.get(socket.id).id,
        accepted: true
      });
    }
  });

  socket.on('rejectGame', (requestingPlayerId) => {
    const targetSocket = Array.from(connectedPlayers.entries())
      .find(([_, player]) => player.id === requestingPlayerId)?.[0];

    if (targetSocket) {
      io.to(targetSocket).emit('gameRequestResponse', {
        playerId: connectedPlayers.get(socket.id).id,
        accepted: false
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    connectedPlayers.delete(socket.id);
    io.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server running on port ${process.env.PORT || 8080}`);
});