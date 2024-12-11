const http = require('http');
const { app } = require('./app');
const { Server } = require('socket.io');
const port = process.env.PORT || 8080;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store player data and chat history
const connectedPlayers = new Map();
const chatHistory = []; // To store chat messages in memory (consider database for persistence)

io.on('connection', (socket) => {
  socket.on('playerJoined', (player) => {
    connectedPlayers.set(player.id, {
      id: player.id,
      name: player.name || `Player ${player.id}`,
      socketId: socket.id,
    });

    // Emit chat history to the newly connected player
    socket.emit('chatHistory', chatHistory);

    // Emit updated list of players to all connected clients
    io.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });

  socket.on('chatMessage', (message) => {
    const messageWithSender = {
      sender: message.sender,
      content: message.content,
      timestamp: new Date().toISOString(),
    };
    chatHistory.push(messageWithSender); // Add message to chat history
    io.emit('chatMessage', messageWithSender); // Broadcast message to all clients
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
