// server/socket/socketHandler.js
const { v4: uuidv4 } = require('uuid');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedPlayers = new Map();
    this.activeGames = new Map();
    this.gameRequests = new Map();
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      const playerId = socket.handshake.query.playerId;
      const playerName = socket.handshake.query.playerName;

      // Store player connection
      this.connectedPlayers.set(playerId, {
        socket,
        playerId,
        playerName,
        status: 'available'
      });

      // Handle player connection
      socket.on('playerConnected', (data) => {
        this.broadcastConnectedPlayers();
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.connectedPlayers.delete(playerId);
        this.broadcastConnectedPlayers();
      });

      // Handle game requests
      socket.on('sendGameRequest', (data) => {
        const requestId = uuidv4();
        const request = {
          id: requestId,
          fromPlayerId: data.fromPlayerId,
          toPlayerId: data.toPlayerId,
          playerName: data.playerName,
          timestamp: Date.now()
        };

        this.gameRequests.set(requestId, request);

        const toPlayer = this.connectedPlayers.get(data.toPlayerId);
        if (toPlayer) {
          toPlayer.socket.emit('gameRequest', request);
        }
      });

      // Handle game request responses
      socket.on('respondToGameRequest', async (data) => {
        const request = this.gameRequests.get(data.requestId);
        if (!request) return;

        const fromPlayer = this.connectedPlayers.get(request.fromPlayerId);
        if (!fromPlayer) return;

        if (data.accepted) {
          // Create new game
          const gameId = uuidv4();
          const game = {
            id: gameId,
            players: [request.fromPlayerId, data.toPlayerId],
            currentTurn: request.fromPlayerId,
            status: 'active',
            scores: {}
          };

          this.activeGames.set(gameId, game);

          // Update player statuses
          this.connectedPlayers.get(request.fromPlayerId).status = 'in-game';
          this.connectedPlayers.get(data.toPlayerId).status = 'in-game';

          // Notify both players
          fromPlayer.socket.emit('gameRequestResponse', {
            accepted: true,
            gameId,
            opponentId: data.toPlayerId
          });

          socket.emit('gameRequestResponse', {
            accepted: true,
            gameId,
            opponentId: request.fromPlayerId
          });
        } else {
          fromPlayer.socket.emit('gameRequestResponse', {
            accepted: false
          });
        }

        // Clean up request
        this.gameRequests.delete(data.requestId);
      });

      // Handle game actions
      socket.on('diceRoll', (data) => {
        const game = this.activeGames.get(data.gameId);
        if (!game || game.currentTurn !== playerId) return;

        // Broadcast roll to other player
        const otherPlayerId = game.players.find(id => id !== playerId);
        const otherPlayer = this.connectedPlayers.get(otherPlayerId);
        if (otherPlayer) {
          otherPlayer.socket.emit('opponentRoll', {
            dice: data.dice
          });
        }
      });

      socket.on('submitScore', (data) => {
        const game = this.activeGames.get(data.gameId);
        if (!game || game.currentTurn !== playerId) return;

        // Update game state
        game.scores[playerId] = game.scores[playerId] || {};
        game.scores[playerId][data.category] = data.score;

        // Switch turns
        const otherPlayerId = game.players.find(id => id !== playerId);
        game.currentTurn = otherPlayerId;

        // Notify both players
        const otherPlayer = this.connectedPlayers.get(otherPlayerId);
        if (otherPlayer) {
          otherPlayer.socket.emit('turnChanged', {
            currentTurn: otherPlayerId,
            lastScore: {
              playerId,
              category: data.category,
              score: data.score
            }
          });
        }

        socket.emit('turnChanged', {
          currentTurn: otherPlayerId,
          lastScore: {
            playerId,
            category: data.category,
            score: data.score
          }
        });
      });

      // Handle get connected players request
      socket.on('getConnectedPlayers', () => {
        this.sendConnectedPlayers(socket);
      });
    });
  }

  broadcastConnectedPlayers() {
    const players = Array.from(this.connectedPlayers.values()).map(({ playerId, playerName, status }) => ({
      player_id: playerId,
      name: playerName,
      status
    }));

    this.io.emit('connectedPlayers', players);
  }

  sendConnectedPlayers(socket) {
    const players = Array.from(this.connectedPlayers.values()).map(({ playerId, playerName, status }) => ({
      player_id: playerId,
      name: playerName,
      status
    }));

    socket.emit('connectedPlayers', players);
  }
}

module.exports = SocketHandler;