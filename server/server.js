const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initializeWebSocket, setupHeartbeat } = require('../server/utils/webSocket');

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
  },
  pingTimeout: 30000,
  pingInterval: 25000
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

// Initialize WebSocket
initializeWebSocket(io);
setupHeartbeat(io);

const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});