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

const connectedPlayers = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('playerJoined', (playerData) => {
    console.log('Player joined:', playerData);
    
    // Store player information with socket ID as key
    connectedPlayers.set(socket.id, {
      id: playerData.id,
      name: playerData.name,
      socketId: socket.id
    });

    // Send current players list to all clients
    const players = Array.from(connectedPlayers.values());
    io.emit('playersUpdate', players);
  });

  socket.on('chatMessage', (messageData) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    // Ensure the message has all required fields
    const messageToSend = {
      content: messageData.content,
      sender: player.name,
      timestamp: new Date().toISOString()
    };

    // Broadcast message to all clients
    io.emit('chatMessage', messageToSend);
  });

  socket.on('disconnect', () => {
    console.log('Disconnection:', socket.id);
    
    // Remove the disconnected player
    connectedPlayers.delete(socket.id);
    
    // Update all clients with new player list
    const players = Array.from(connectedPlayers.values());
    io.emit('playersUpdate', players);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});