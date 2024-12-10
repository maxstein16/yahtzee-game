const io = require('./server').io;

const activePlayers = {}; // Track connected players

io.on('connection', (socket) => {
  const { playerId, playerName } = socket.handshake.query;

  // Add player to the active list
  activePlayers[playerId] = { id: playerId, name: playerName, socketId: socket.id };
  io.emit('update_players', activePlayers);

  console.log(`${playerName} connected (${playerId})`);

  // Handle game request
  socket.on('game_request', ({ toPlayerId, fromPlayer }) => {
    const targetPlayer = activePlayers[toPlayerId];
    if (targetPlayer) {
      io.to(targetPlayer.socketId).emit('game_request', { fromPlayer });
    }
  });

  // Handle game request response
  socket.on('game_response', ({ accepted, fromPlayer, toPlayerId }) => {
    const targetPlayer = activePlayers[fromPlayer.id];
    if (targetPlayer) {
      io.to(targetPlayer.socketId).emit('game_response', { accepted, toPlayerId });
      if (accepted) {
        // Notify both players to start the game
        const gameId = `${fromPlayer.id}-${toPlayerId}-${Date.now()}`;
        io.to(targetPlayer.socketId).emit('start_game', { gameId });
        io.to(socket.id).emit('start_game', { gameId });
      }
    }
  });

  // Handle chat message
  socket.on('chat_message', ({ gameId, message, sender }) => {
    io.to(`game:${gameId}`).emit('chat_message', { message, sender, timestamp: new Date().toISOString() });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    delete activePlayers[playerId];
    io.emit('update_players', activePlayers);
    console.log(`${playerName} disconnected (${playerId})`);
  });
});
