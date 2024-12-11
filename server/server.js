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

// Centralized user and game state management
const users = {
  socket: {},    // Socket instances by socket ID
  info: {}       // User info by player ID
};

const activeGames = new Map();
const chatHistory = [];

// Utility function to send direct messages
const sendToUser = (playerId, type, data) => {
  if (users.info[playerId]) {
    io.to(users.info[playerId].socketId).emit(type, data);
  }
};

io.on('connection', (socket) => {
  socket.on('playerJoined', (player) => {
    if (!player.id || !player.name) {
      socket.emit('error', { message: 'Invalid player data' });
      return;
    }

    // Store user information
    users.socket[socket.id] = player.id;
    users.info[player.id] = {
      id: player.id,
      name: player.name,
      socketId: socket.id
    };

    // Send chat history to new player
    socket.emit('chatHistory', chatHistory);

    // Notify all connected players about the updated player list
    const playerList = Object.values(users.info);
    Object.values(users.info).forEach(user => {
      sendToUser(user.id, 'playersUpdate', playerList);
    });
  });

  // Handle game challenge
  socket.on('gameChallenge', ({ challenger, opponentId, gameId }) => {
    if (!users.info[opponentId]) {
      socket.emit('error', { message: 'Opponent not available' });
      return;
    }

    sendToUser(opponentId, 'gameChallenge', {
      challenger,
      gameId
    });
  });

  // Handle challenge acceptance
  socket.on('challengeAccepted', ({ challengerId, gameId }) => {
    // Initialize game state
    activeGames.set(gameId, {
      currentTurn: challengerId,
      dice: [1, 1, 1, 1, 1],
      rollCount: 0,
      players: {
        challenger: challengerId,
        opponent: users.socket[socket.id]
      }
    });

    const gameState = {
      gameId,
      currentTurn: challengerId,
      players: {
        challenger: challengerId,
        opponent: users.socket[socket.id]
      }
    };

    // Notify both players
    sendToUser(challengerId, 'gameStart', gameState);
    sendToUser(users.socket[socket.id], 'gameStart', gameState);

    // Send initial turn state
    sendToUser(challengerId, 'turnChange', {
      gameId,
      currentPlayer: challengerId,
      previousPlayer: null
    });
    sendToUser(users.socket[socket.id], 'turnChange', {
      gameId,
      currentPlayer: challengerId,
      previousPlayer: null
    });
  });

  // Handle dice rolls
  socket.on('diceRolled', ({ gameId, dice, player }) => {
    const game = activeGames.get(gameId);
    
    if (!game || game.currentTurn !== player) {
      socket.emit('error', { message: "Not your turn!" });
      return;
    }

    game.dice = dice;
    game.rollCount++;

    // Send to opponent only
    const opponentId = game.players.challenger === player ? 
      game.players.opponent : 
      game.players.challenger;
    
    sendToUser(opponentId, 'diceRolled', {
      gameId,
      dice,
      player
    });
  });

  // Handle turn end
  socket.on('turnEnd', ({ gameId, nextPlayer }) => {
    const game = activeGames.get(gameId);
    if (game) {
      game.currentTurn = nextPlayer;
      game.rollCount = 0;
      game.dice = [1, 1, 1, 1, 1];

      // Notify both players
      const turnData = {
        gameId,
        currentPlayer: nextPlayer,
        previousPlayer: game.currentTurn
      };

      sendToUser(game.players.challenger, 'turnChange', turnData);
      sendToUser(game.players.opponent, 'turnChange', turnData);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const playerId = users.socket[socket.id];
    if (playerId) {
      delete users.info[playerId];
      delete users.socket[socket.id];

      // Notify remaining players about the disconnection
      const playerList = Object.values(users.info);
      Object.values(users.info).forEach(user => {
        sendToUser(user.id, 'playersUpdate', playerList);
      });
    }

    // Clean up games
    for (const [gameId, game] of activeGames.entries()) {
      if (game.players.challenger === playerId || game.players.opponent === playerId) {
        const otherPlayerId = game.players.challenger === playerId ? 
          game.players.opponent : 
          game.players.challenger;
        
        sendToUser(otherPlayerId, 'playerDisconnected', { 
          gameId, 
          playerId 
        });
        
        activeGames.delete(gameId);
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});