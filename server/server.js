const http = require('http');
const { app } = require('./app');
const { Server } = require('socket.io');
const API = require('./routes/index');

const port = process.env.PORT || 8080;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store player data with both socket ID and player ID mapping
const connectedPlayers = new Map();
const socketToPlayer = new Map();

io.on('connection', (socket) => {
  socket.on('playerJoined', (player) => {
    connectedPlayers.set(player.id, { id: player.id, name: player.name, socketId: socket.id });

    // Emit updated list of players to all connected clients
    io.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });

  socket.on('disconnect', () => {
    for (const [id, data] of connectedPlayers.entries()) {
      if (data.socketId === socket.id) {
        connectedPlayers.delete(id);
        break;
      }
    }

    // Emit updated list of players to all connected clients
    io.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });
});
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});