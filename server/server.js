const http = require('http');
const { app } = require('./app');
const { Server } = require('socket.io');

const port = process.env.PORT || 8080;
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://yahtzee.maxstein.info'],
    methods: ['GET', 'POST'],
  },
});

// In-memory storage for player matchmaking and games
const waitingPlayers = [];
const activeGames = {};

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Handle player requesting to join a multiplayer game
  socket.on('joinGame', () => {
    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers.pop();

      // Create a new game session
      const gameId = `${socket.id}-${opponent.id}`;
      activeGames[gameId] = {
        players: [socket.id, opponent.id],
        gameState: {
          scores: {},
          currentPlayer: socket.id,
          dice: [1, 1, 1, 1, 1],
        },
      };

      // Notify players
      socket.emit('gameStart', { gameId, opponentId: opponent.id });
      opponent.emit('gameStart', { gameId, opponentId: socket.id });
    } else {
      // Add player to waiting list
      waitingPlayers.push(socket);
      socket.emit('waitingForPlayer');
    }
  });

  // Handle dice rolls
  socket.on('rollDice', ({ gameId }) => {
    const game = activeGames[gameId];
    if (!game || !game.players.includes(socket.id)) return;

    // Update dice rolls for the game
    game.gameState.dice = Array.from({ length: 5 }, () => Math.ceil(Math.random() * 6));
    io.to(game.players[0]).emit('diceUpdate', { dice: game.gameState.dice });
    io.to(game.players[1]).emit('diceUpdate', { dice: game.gameState.dice });
  });

  // Handle score submission
  socket.on('submitScore', ({ gameId, score }) => {
    const game = activeGames[gameId];
    if (!game || !game.players.includes(socket.id)) return;

    // Update scores
    game.gameState.scores[socket.id] = score;
    io.to(game.players[0]).emit('scoreUpdate', { scores: game.gameState.scores });
    io.to(game.players[1]).emit('scoreUpdate', { scores: game.gameState.scores });
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove player from waiting list
    const index = waitingPlayers.findIndex((player) => player.id === socket.id);
    if (index !== -1) waitingPlayers.splice(index, 1);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
