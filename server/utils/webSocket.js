// server/websocket.js

const availablePlayers = new Map();
const gameRequests = new Map();
const chatRooms = new Map();
const activeGames = new Map();

function initializeWebSocket(io) {
  io.on('connection', async (socket) => {
    const { gameId, playerId, playerName } = socket.handshake.query;
    console.log(`Socket connected: Player ${playerName} (${playerId})`);

    // Handle initial connection
    if (gameId) {
      // Player is joining a game room
      const roomId = `game:${gameId}`;
      await socket.join(roomId);
      
      if (!chatRooms.has(gameId)) {
        chatRooms.set(gameId, {
          messages: [],
          participants: new Map()
        });
      }
      
      const room = chatRooms.get(gameId);
      room.participants.set(playerId, {
        socketId: socket.id,
        name: playerName
      });

      // Send chat history
      if (room.messages.length > 0) {
        socket.emit('chat_history', room.messages);
      }
    } else {
      // Player is entering the lobby
      availablePlayers.set(playerId, {
        id: playerId,
        name: playerName,
        socketId: socket.id,
        status: 'Available'
      });
      
      io.emit('available_players', Array.from(availablePlayers.values()));
    }

    // Handle game requests
    socket.on('send_game_request', async (data) => {
      const { playerId: requesterId, opponentId } = data;
      const requester = availablePlayers.get(requesterId);
      const opponent = availablePlayers.get(opponentId);
      
      if (!opponent) {
        socket.emit('request_response', {
          accepted: false,
          playerId: opponentId,
          message: 'Player not available'
        });
        return;
      }

      const requestId = `req_${Date.now()}`;
      gameRequests.set(requestId, {
        requestId,
        fromId: requesterId,
        toId: opponentId,
        status: 'pending',
        timestamp: Date.now()
      });

      // Send request to opponent
      io.to(opponent.socketId).emit('game_request', {
        requestId,
        playerId: requesterId,
        playerName: requester.name
      });
    });

    // Handle request acceptance
    socket.on('accept_game_request', async (data) => {
      const { requestId, playerId, opponentId } = data;
      const request = gameRequests.get(requestId);
      
      if (!request || request.status !== 'pending') return;

      request.status = 'accepted';
      const newGameId = `multi_${Date.now()}`;
      
      // Create game room
      const gameRoom = {
        gameId: newGameId,
        players: [playerId, opponentId],
        status: 'starting',
        created: Date.now()
      };
      activeGames.set(newGameId, gameRoom);

      // Remove players from available list
      availablePlayers.delete(playerId);
      availablePlayers.delete(opponentId);
      
      // Notify both players
      io.to(socket.id).emit('game_start', { 
        gameId: newGameId, 
        opponentId,
        isFirstPlayer: true
      });

      const opponent = gameRequests.get(requestId)?.fromId === opponentId
        ? availablePlayers.get(opponentId)
        : availablePlayers.get(request.fromId);

      if (opponent) {
        io.to(opponent.socketId).emit('game_start', { 
          gameId: newGameId, 
          opponentId: playerId,
          isFirstPlayer: false
        });
      }

      // Update lobby
      io.emit('available_players', Array.from(availablePlayers.values()));
      gameRequests.delete(requestId);
    });

    // Handle request declination
    socket.on('decline_game_request', async (data) => {
      const { requestId, playerId, opponentId } = data;
      const request = gameRequests.get(requestId);
      
      if (!request) return;
      
      request.status = 'declined';
      gameRequests.delete(requestId);
      
      const opponent = availablePlayers.get(opponentId);
      if (opponent) {
        io.to(opponent.socketId).emit('request_response', {
          accepted: false,
          playerId,
          playerName: availablePlayers.get(playerId)?.name
        });
      }
    });

    // Handle chat messages
    socket.on('chat_message', (message) => {
      if (!message.gameId) return;
      
      const room = chatRooms.get(message.gameId);
      if (!room) return;

      const enhancedMessage = {
        ...message,
        timestamp: new Date().toISOString(),
        messageId: Date.now()
      };

      room.messages.push(enhancedMessage);
      io.in(`game:${message.gameId}`).emit('chat_message', enhancedMessage);
    });

    // Handle game moves
    socket.on('game_move', (move) => {
      const { gameId } = move;
      if (!gameId || !activeGames.has(gameId)) return;

      const gameRoom = `game:${gameId}`;
      socket.to(gameRoom).emit('opponent_move', move);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: Player ${playerName} (${playerId})`);
      
      // Clean up player from lobby
      availablePlayers.delete(playerId);
      io.emit('available_players', Array.from(availablePlayers.values()));

      // Clean up from game rooms
      if (gameId) {
        const room = chatRooms.get(gameId);
        if (room) {
          room.participants.delete(playerId);
          if (room.participants.size === 0) {
            chatRooms.delete(gameId);
          }
        }

        // Notify opponent if in active game
        const game = activeGames.get(gameId);
        if (game) {
          const opponentId = game.players.find(id => id !== playerId);
          if (opponentId) {
            io.to(`game:${gameId}`).emit('player_disconnected', {
              playerId,
              playerName
            });
          }
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'Internal socket error' });
    });
  });
}

function setupHeartbeat(io) {
  setInterval(() => {
    io.emit('ping');
  }, 25000);

  // Clean up stale game requests
  setInterval(() => {
    const now = Date.now();
    for (const [requestId, request] of gameRequests) {
      if (now - request.timestamp > 60000) { // 1 minute timeout
        gameRequests.delete(requestId);
      }
    }
  }, 60000);
}

module.exports = { 
  initializeWebSocket,
  setupHeartbeat
};