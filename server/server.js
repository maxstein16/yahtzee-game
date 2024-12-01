const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://yahtzee.maxstein.info'], // Add your frontend URL here
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('chatMessage', (msg) => {
    console.log('Chat message received:', msg);
    // Broadcast the chat message to all clients
    io.emit('NEW_CHAT_MESSAGE', msg);
  });

  socket.on('gameUpdate', (update) => {
    console.log('Game update received:', update);
    // Broadcast game updates
    io.emit('GAME_UPDATE', update);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
