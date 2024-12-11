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

// Store data
const connectedPlayers = new Map();
const chatHistory = [];
const activeChallenges = new Map();
const activeGames = new Map(); // Track active games and their states

io.on('connection', (socket) => {
  socket.on('playerJoined', (player) => {
    if (!player.id || !player.name) {
      console.error('Invalid player data received:', player);
      return;
    }

    connectedPlayers.set(player.id, {
      id: player.id,
      name: player.name,
      socketId: socket.id,
    });

    socket.emit('chatHistory', chatHistory);
    io.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });

  // Handle chat messages
  socket.on('chatMessage', (message) => {
    const messageWithSender = {
      sender: message.sender,
      content: message.content,
      timestamp: new Date().toISOString(),
    };
    chatHistory.push(messageWithSender);
    io.emit('chatMessage', messageWithSender);
  });

  // Game challenge handling
  socket.on('gameChallenge', ({ challenger, opponentId, gameId }) => {
    if (!connectedPlayers.has(opponentId)) {
      socket.emit('error', { message: 'Opponent not available' });
      return;
    }

    const opponent = connectedPlayers.get(opponentId);
    const challengeData = { gameId, challenger, opponent, status: 'pending' };
    activeChallenges.set(gameId, challengeData);

    io.to(opponent.socketId).emit('gameChallenge', {
      challenger,
      gameId,
    });
  });

  // Handle challenge acceptance
  socket.on('challengeAccepted', ({ challengerId, gameId }) => {
    console.log(`Game accepted by player for gameId: ${gameId}`);
    
    const challenge = activeChallenges.get(gameId);
    if (challenge) {
      // Initialize game state
      activeGames.set(gameId, {
        currentTurn: challengerId, // Challenger goes first
        dice: [1, 1, 1, 1, 1],
        rollCount: 0,
        players: [challengerId, challenge.opponent.id]
      });

      // Notify both players
      const gameStartPayload = { 
        gameId,
        firstPlayer: challengerId
      };
      
      io.to(connectedPlayers.get(challengerId).socketId).emit('gameStart', gameStartPayload);
      io.to(socket.id).emit('gameStart', gameStartPayload);
    }
  });

  // Handle dice rolls
  socket.on('diceRolled', ({ gameId, dice, player }) => {
    const game = activeGames.get(gameId);
    if (game && game.currentTurn === player) {
      // Update game state
      game.dice = dice;
      game.rollCount++;
      
      // Broadcast the dice roll to both players
      io.emit('diceRolled', {
        gameId,
        dice,
        player
      });
    }
  });

  // Handle turn end
  socket.on('turnEnd', ({ gameId, nextPlayer }) => {
    const game = activeGames.get(gameId);
    if (game) {
      // Update game state
      game.currentTurn = nextPlayer;
      game.rollCount = 0;
      game.dice = [1, 1, 1, 1, 1];

      // Notify all players about the turn change
      io.emit('turnChange', {
        gameId,
        nextPlayer
      });
    }
  });

  // Handle challenge rejection
  socket.on('challengeRejected', ({ challengerId }) => {
    const challenge = Array.from(activeChallenges.values()).find(
      (ch) => ch.challenger.id === challengerId || ch.opponent.id === challengerId
    );

    if (challenge) {
      const opponentId = challenge.challenger.id === challengerId
        ? challenge.opponent.id
        : challenge.challenger.id;

      io.to(connectedPlayers.get(opponentId).socketId).emit('challengeRejected', {
        message: `${connectedPlayers.get(challengerId)?.name || 'Opponent'} declined your challenge.`,
      });

      activeChallenges.delete(challenge.gameId);
    }
  });

  socket.on('disconnect', () => {
    // Clean up player data
    for (const [id, data] of connectedPlayers.entries()) {
      if (data.socketId === socket.id) {
        connectedPlayers.delete(id);
        break;
      }
    }

    // Clean up challenges
    for (const [gameId, challenge] of activeChallenges.entries()) {
      if (
        challenge.challenger.socketId === socket.id ||
        challenge.opponent.socketId === socket.id
      ) {
        activeChallenges.delete(gameId);
      }
    }

    // Clean up games or handle disconnection
    for (const [gameId, game] of activeGames.entries()) {
      if (game.players.includes(socket.id)) {
        // Optionally handle game interruption
        io.emit('playerDisconnected', { gameId, socketId: socket.id });
      }
    }

    io.emit('playersUpdate', Array.from(connectedPlayers.values()));
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});