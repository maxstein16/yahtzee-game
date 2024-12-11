const http = require('http');
const { app } = require('./app');
const { Server } = require('socket.io');
const API = require('./routes/index');

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
      .filter(p => p.id && p.name);
    
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
  socket.on('gameChallenge', ({ challenger, opponentId, gameId }) => {
    const opponent = connectedPlayers.get(opponentId);

    if (!opponent) {
      console.log('Opponent not found or offline:', opponentId);
      socket.emit('challengeFailed', { message: 'Opponent is unavailable.' });
      return;
    }

    // Send challenge request to opponent with game ID
    io.to(opponent.socketId).emit('challengeRequest', { 
      challenger,
      gameId
    });
  });

  socket.on('challengeAccepted', async ({ challengerId, gameId }) => {
    const challenger = connectedPlayers.get(challengerId);
    const acceptingPlayer = connectedPlayers.get(socketToPlayer.get(socket.id));
  
    if (!challenger) {
      console.log('Challenger not found:', challengerId);
      return;
    }
  
    // Notify the challenger with the game ID and opponent info
    io.to(challenger.socketId).emit('challengeAccepted', { 
      gameId,
      opponent: {
        id: acceptingPlayer.id,
        name: acceptingPlayer.name
      }
    });
  });

  // Challenge rejected event
  socket.on('challengeRejected', ({ challengerId }) => {
    const challenger = connectedPlayers.get(challengerId);

    if (!challenger) {
      console.log('Challenger not found:', challengerId);
      return;
    }

    io.to(challenger.socketId).emit('challengeRejected', { 
      message: 'Your challenge was declined.' 
    });
  });

  socket.on('gameStart', async ({ gameId, players }) => {
    try {
      // Update the game status using the API startGame route
      const startResponse = await API.startGame(gameId);
      if (!startResponse.success) {
        console.error('Failed to start the game:', startResponse.message);
        return;
      }
  
      console.log(`Game ${gameId} started successfully`);
  
      // Notify all players about the game start
      players.forEach((playerId) => {
        const player = connectedPlayers.get(playerId);
        if (player) {
          io.to(player.socketId).emit('gameStart', {
            gameId,
            players,
            startTime: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      console.error('Error handling gameStart event:', error);
    }
  });  

  socket.on('diceRoll', ({ dice, gameId }) => {
    const playerId = socketToPlayer.get(socket.id);
    API.getGameById(gameId).then(gameData => {
      // Find opponent ID
      const opponentId = gameData.players.find(p => p !== playerId);
      const opponent = connectedPlayers.get(opponentId);
      if (opponent) {
        io.to(opponent.socketId).emit('opponentRoll', { dice });
      }
    }).catch(error => {
      console.error('Error handling dice roll:', error);
    });
  });
  
  // Add a turn end event
  socket.on('turnEnd', ({ gameId, nextPlayer }) => {
    const nextPlayerSocket = connectedPlayers.get(nextPlayer)?.socketId;
    if (nextPlayerSocket) {
      io.to(nextPlayerSocket).emit('turnChange', { nextPlayer });
    }
  });

  // Score submission event
  socket.on('scoreCategory', async ({ gameId, categoryName, score, nextPlayerId }) => {
    const currentPlayerId = socketToPlayer.get(socket.id);
    
    try {
      // Submit the score to the server
      await API.submitGameScore(gameId, currentPlayerId, categoryName, score);
  
      // Get both players' updated categories
      const currentPlayerCategories = await API.getPlayerCategories(currentPlayerId);
      const opponentCategories = await API.getPlayerCategories(nextPlayerId);
  
      // Emit updates to both players
      const currentPlayerSocket = connectedPlayers.get(currentPlayerId)?.socketId;
      const nextPlayerSocket = connectedPlayers.get(nextPlayerId)?.socketId;
  
      if (currentPlayerSocket) {
        io.to(currentPlayerSocket).emit('categoriesUpdate', {
          categories: currentPlayerCategories,
          isMyTurn: false
        });
      }
  
      if (nextPlayerSocket) {
        io.to(nextPlayerSocket).emit('categoriesUpdate', {
          categories: opponentCategories,
          isMyTurn: true
        });
        
        // Notify the next player it's their turn
        io.to(nextPlayerSocket).emit('turnChange', {
          nextPlayer: nextPlayerId,
          diceValues: [1, 1, 1, 1, 1], // Reset dice for new turn
          rollCount: 0
        });
      }
  
    } catch (error) {
      console.error('Error in score submission:', error);
      socket.emit('scoreError', { error: error.message });
    }
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