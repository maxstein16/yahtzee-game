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

// Store player data, chat history, and game challenges
const connectedPlayers = new Map();
const chatHistory = [];
const activeChallenges = new Map(); // Map to track active game challenges

io.on('connection', (socket) => {
  socket.on('playerJoined', (player) => {
    if (!player.id || !player.name) {
      console.error('Invalid player data received:', player);
      return; // Reject invalid player data
    }

    // Store player data
    connectedPlayers.set(player.id, {
      id: player.id,
      name: player.name,
      socketId: socket.id,
    });

    // Send chat history to the newly connected player
    socket.emit('chatHistory', chatHistory);

    // Send the updated list of players to all clients
    io.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });

  socket.on('chatMessage', (message) => {
    const messageWithSender = {
      sender: message.sender,
      content: message.content,
      timestamp: new Date().toISOString(),
    };
    chatHistory.push(messageWithSender);
    io.emit('chatMessage', messageWithSender);
  });

  // Handle game challenges
  socket.on('gameChallenge', ({ challenger, opponentId, gameId }) => {
    if (!connectedPlayers.has(opponentId)) {
      socket.emit('error', { message: 'Opponent not available' });
      return;
    }

    const opponent = connectedPlayers.get(opponentId);
    const challengeData = { gameId, challenger, opponent, status: 'pending' };

    // Store the challenge
    activeChallenges.set(gameId, challengeData);

    // Notify the opponent about the challenge
    io.to(opponent.socketId).emit('gameChallenge', {
      challenger,
      gameId,
    });
  });

  // Handle challenge acceptance
  socket.on('challengeAccepted', ({ challengerId, gameId }) => {
    const challenge = activeChallenges.get(gameId);
    if (!challenge) {
      socket.emit('error', { message: 'Challenge not found' });
      return;
    }

    challenge.status = 'accepted';

    // Check if both players have accepted
    if (challenge.challenger.id === challengerId) {
      challenge.challengerAccepted = true;
    } else if (challenge.opponent.id === challengerId) {
      challenge.opponentAccepted = true;
    }

    if (challenge.challengerAccepted && challenge.opponentAccepted) {
      // Notify both players to start the game
      io.to(challenge.challenger.socketId).emit('gameStart', { gameId });
      io.to(challenge.opponent.socketId).emit('gameStart', { gameId });

      // Remove the challenge
      activeChallenges.delete(gameId);
    }
  });

  // Handle challenge rejection
  socket.on('challengeRejected', ({ challengerId }) => {
    const challenge = Array.from(activeChallenges.values()).find(
      (ch) => ch.challenger.id === challengerId || ch.opponent.id === challengerId
    );

    if (challenge) {
      const opponentId =
        challenge.challenger.id === challengerId
          ? challenge.opponent.id
          : challenge.challenger.id;

      // Notify the challenger about the rejection
      io.to(connectedPlayers.get(opponentId).socketId).emit('challengeRejected', {
        message: `${connectedPlayers.get(challengerId)?.name || 'Opponent'} declined your challenge.`,
      });

      // Remove the challenge
      activeChallenges.delete(challenge.gameId);
    }
  });

  socket.on('disconnect', () => {
    for (const [id, data] of connectedPlayers.entries()) {
      if (data.socketId === socket.id) {
        connectedPlayers.delete(id);
        break;
      }
    }

    // Remove active challenges involving the disconnected player
    for (const [gameId, challenge] of activeChallenges.entries()) {
      if (
        challenge.challenger.socketId === socket.id ||
        challenge.opponent.socketId === socket.id
      ) {
        activeChallenges.delete(gameId);
      }
    }

    // Emit updated list of players to all clients
    io.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
