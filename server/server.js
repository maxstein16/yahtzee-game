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

// Centralized state management
const users = {
  socket: {},    // Socket instances by socket ID
  info: {}       // User info by player ID
};

const activeGames = new Map();
const chatHistory = [];

// Helper function for direct messages
const sendToUser = (playerId, type, data) => {
  if (users.info[playerId]) {
    io.to(users.info[playerId].socketId).emit(type, data);
  }
};

// Helper to broadcast player list
const broadcastPlayerList = () => {
  const playerList = Object.values(users.info).map(user => ({
    id: user.id,
    name: user.name
  }));
  io.emit('playersUpdate', playerList);
};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('playerJoined', (player) => {
    if (!player.id || !player.name) {
      socket.emit('error', { message: 'Invalid player data' });
      return;
    }

    console.log('Player joined:', player);

    // Store user information
    users.socket[socket.id] = player.id;
    users.info[player.id] = {
      id: player.id,
      name: player.name,
      socketId: socket.id
    };

    // Send initial data to new player
    socket.emit('chatHistory', chatHistory);
    broadcastPlayerList();
  });

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

  socket.on('challengeAccepted', ({ challengerId, gameId }) => {
    const accepterId = users.socket[socket.id];
    
    activeGames.set(gameId, {
      currentTurn: challengerId,
      dice: [1, 1, 1, 1, 1],
      rollCount: 0,
      players: {
        challenger: challengerId,
        opponent: accepterId
      }
    });

    const gameState = {
      gameId,
      currentTurn: challengerId,
      players: {
        challenger: challengerId,
        opponent: accepterId
      }
    };

    // Notify both players
    sendToUser(challengerId, 'gameStart', gameState);
    sendToUser(accepterId, 'gameStart', gameState);

    sendToUser(challengerId, 'turnChange', {
      gameId,
      currentPlayer: challengerId,
      previousPlayer: null
    });
    sendToUser(accepterId, 'turnChange', {
      gameId,
      currentPlayer: challengerId,
      previousPlayer: null
    });
  });

  socket.on('diceRolled', ({ gameId, dice, player }) => {
    const game = activeGames.get(gameId);
    
    if (!game || game.currentTurn !== player) {
      socket.emit('error', { message: "Not your turn!" });
      return;
    }

    game.dice = dice;
    game.rollCount++;

    const opponentId = game.players.challenger === player ? 
      game.players.opponent : 
      game.players.challenger;
    
    sendToUser(opponentId, 'diceRolled', {
      gameId,
      dice,
      player
    });
  });

  socket.on('turnEnd', ({ gameId, nextPlayer }) => {
    const game = activeGames.get(gameId);
    if (game) {
      game.currentTurn = nextPlayer;
      game.rollCount = 0;
      game.dice = [1, 1, 1, 1, 1];

      const turnData = {
        gameId,
        currentPlayer: nextPlayer,
        previousPlayer: game.currentTurn
      };

      sendToUser(game.players.challenger, 'turnChange', turnData);
      sendToUser(game.players.opponent, 'turnChange', turnData);
    }
  });

  socket.on('disconnect', () => {
    const playerId = users.socket[socket.id];
    if (playerId) {
      console.log('Player disconnected:', playerId);
      delete users.info[playerId];
      delete users.socket[socket.id];
      broadcastPlayerList();

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
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});