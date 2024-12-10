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

  // Handle player joining
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

  // Handle challengePlayer event
  socket.on('challengePlayer', ({ challengerId, challengerName, opponentId }) => {
    console.log('Challenge initiated:', { challengerId, challengerName, opponentId });

    const opponent = connectedPlayers.get(opponentId);
    if (opponent) {
      // Notify the challenged player
      io.to(opponent.socketId).emit('challengeReceived', {
        challenger: { id: challengerId, name: challengerName },
      });
    } else {
      console.log(`Opponent with ID ${opponentId} not found or not connected.`);
    }
  });

  socket.on('acceptChallenge', ({ challengerId, challengerName, acceptorId }) => {
    console.log('Challenge accepted:', { challengerId, challengerName, acceptorId });

    const game = createGame(acceptorId, challengerId);
    io.to(socketToPlayer.get(challengerId)).emit('challengeAccepted', game);
    io.to(socketToPlayer.get(acceptorId)).emit('challengeAccepted', game);
  });

  socket.on('rejectChallenge', ({ challengerId }) => {
    console.log('Challenge rejected:', { challengerId });

    io.to(socketToPlayer.get(challengerId)).emit('challengeRejected', challengerId);
  });

  socket.on('rejectChallenge', ({ challengerId }) => {
    console.log('Challenge rejected:', { challengerId });

    io.to(socketToPlayer.get(challengerId)).emit('challengeRejected', challengerId);
  });

  // Handle chat messages
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

  // Handle disconnect
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