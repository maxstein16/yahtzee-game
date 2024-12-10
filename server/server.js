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

// Store player data with both socket ID and player ID mapping
const connectedPlayers = new Map();
const socketToPlayer = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Player joined event
  socket.on('playerJoined', (playerData) => {
    if (!playerData.id || !playerData.name) {
      console.log('Invalid player data:', playerData);
      return;
    }

    // Store player data
    const playerInfo = {
      id: playerData.id,
      name: playerData.name,
      socketId: socket.id
    };

    connectedPlayers.set(playerData.id, playerInfo);
    socketToPlayer.set(socket.id, playerData.id);

    // Send current players list
    const players = Array.from(connectedPlayers.values())
      .filter(p => p.id && p.name); // Filter out invalid entries
    
    io.emit('playersUpdate', players);
  });

  // Chat message event
  socket.on('chatMessage', (messageData) => {
    const playerId = socketToPlayer.get(socket.id);
    const player = connectedPlayers.get(playerId);
    
    if (!player) {
      console.log('Player not found for message:', socket.id);
      return;
    }

    const messageToSend = {
      content: messageData.content,
      sender: player.name,
      timestamp: new Date().toISOString()
    };

    // Broadcast message to all clients
    io.emit('chatMessage', messageToSend);
  });

  // Game challenge event
  socket.on('gameChallenge', ({ challenger, opponentId }) => {
    const opponent = connectedPlayers.get(opponentId);

    if (!opponent) {
      console.log('Opponent not found or offline:', opponentId);
      socket.emit('challengeFailed', { message: 'Opponent is unavailable.' });
      return;
    }

    // Send challenge request to opponent
    io.to(opponent.socketId).emit('challengeRequest', { challenger });
  });

  // Challenge accepted event
  socket.on('challengeAccepted', ({ challengerId }) => {
    const challenger = connectedPlayers.get(challengerId);

    if (!challenger) {
      console.log('Challenger not found:', challengerId);
      return;
    }

    // Notify both players to start the game
    io.to(challenger.socketId).emit('challengeAccepted');
    io.to(socket.id).emit('challengeAccepted');
    console.log(`Game started between ${challenger.name} and ${socketToPlayer.get(socket.id)}`);
  });

  // Challenge rejected event
  socket.on('challengeRejected', ({ challengerId }) => {
    const challenger = connectedPlayers.get(challengerId);

    if (!challenger) {
      console.log('Challenger not found:', challengerId);
      return;
    }

    // Notify challenger about rejection
    io.to(challenger.socketId).emit('challengeRejected', { message: 'Your challenge was declined.' });
  });

  // Disconnect event
  socket.on('disconnect', () => {
    const playerId = socketToPlayer.get(socket.id);
    if (playerId) {
      connectedPlayers.delete(playerId);
      socketToPlayer.delete(socket.id);

      // Update player list
      const players = Array.from(connectedPlayers.values())
        .filter(p => p.id && p.name);
      
      io.emit('playersUpdate', players);
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});