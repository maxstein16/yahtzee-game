// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://yahtzee.maxstein.info',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// CORS configuration
const corsOptions = {
  origin: [
    'https://yahtzee.maxstein.info',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(express.json());

// WebSocket event handlers
io.on('connection', (socket) => {
  const { gameId, playerId } = socket.handshake.query;
  console.log(`Player ${playerId} connected to game ${gameId}`);

  socket.join(`game:${gameId}`);

  socket.on('chat_message', (message) => {
    io.to(`game:${gameId}`).emit('chat_message', {
      ...message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player ${playerId} disconnected from game ${gameId}`);
  });
});

// Your existing routes
const routes = require('./routes');
app.use('/api', routes());

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something broke!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = { app, server, io };