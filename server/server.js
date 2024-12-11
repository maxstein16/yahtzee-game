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
    connectedPlayers.set(player.id, socket.id);
  });

  socket.on('chatMessage', (message) => {
    io.emit('chatMessage', message);
  });

  socket.on('disconnect', () => {
    for (const [id, sid] of connectedPlayers.entries()) {
      if (sid === socket.id) {
        connectedPlayers.delete(id);
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});