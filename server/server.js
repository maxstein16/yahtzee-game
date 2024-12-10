// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Configure Socket.IO
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  allowEIO3: true, // Allow Engine.IO version 3
  pingTimeout: 60000, // Increase ping timeout
  pingInterval: 25000, // Increase ping interval
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  const { playerId, playerName } = socket.handshake.query;

  // Add player to connected players list
  socket.playerId = playerId;
  socket.playerName = playerName;

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Your existing socket event handlers go here
});

// Error handling for the server
server.on('error', (error) => {
  console.error('Server error:', error);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});