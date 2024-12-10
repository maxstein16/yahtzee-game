// server/server.js
const express = require('express');
const cors = require('cors');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// CORS setup
app.use(cors({
  origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (required for Cloud Run)
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// API routes
app.use('/api', require('./routes')());

// Track connected players
const connectedPlayers = new Map();

// Socket connection handling
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('playerJoined', (playerData) => {
    try {
      console.log('Player joined:', playerData);
      connectedPlayers.set(socket.id, {
        ...playerData,
        socketId: socket.id
      });
      io.emit('playersUpdate', Array.from(connectedPlayers.values()));
    } catch (error) {
      console.error('Error in playerJoined:', error);
    }
  });

  socket.on('getPlayers', () => {
    try {
      socket.emit('playersUpdate', Array.from(connectedPlayers.values()));
    } catch (error) {
      console.error('Error in getPlayers:', error);
    }
  });

  socket.on('requestGame', (targetPlayerId) => {
    try {
      const requestingPlayer = connectedPlayers.get(socket.id);
      const targetSocket = Array.from(connectedPlayers.entries())
        .find(([_, player]) => player.id === targetPlayerId)?.[0];

      if (targetSocket) {
        io.to(targetSocket).emit('gameRequest', requestingPlayer);
      }
    } catch (error) {
      console.error('Error in requestGame:', error);
    }
  });

  socket.on('acceptGame', (requestingPlayerId) => {
    try {
      const targetSocket = Array.from(connectedPlayers.entries())
        .find(([_, player]) => player.id === requestingPlayerId)?.[0];

      if (targetSocket) {
        io.to(targetSocket).emit('gameRequestResponse', {
          playerId: connectedPlayers.get(socket.id).id,
          accepted: true
        });
      }
    } catch (error) {
      console.error('Error in acceptGame:', error);
    }
  });

  socket.on('rejectGame', (requestingPlayerId) => {
    try {
      const targetSocket = Array.from(connectedPlayers.entries())
        .find(([_, player]) => player.id === requestingPlayerId)?.[0];

      if (targetSocket) {
        io.to(targetSocket).emit('gameRequestResponse', {
          playerId: connectedPlayers.get(socket.id).id,
          accepted: false
        });
      }
    } catch (error) {
      console.error('Error in rejectGame:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      console.log('Player disconnected:', socket.id);
      connectedPlayers.delete(socket.id);
      io.emit('playersUpdate', Array.from(connectedPlayers.values()));
    } catch (error) {
      console.error('Error in disconnect:', error);
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const port = parseInt(process.env.PORT) || 8080;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };