// services/multiplayerService.js
import io from 'socket.io-client';

class MultiplayerService {
  constructor(baseUrl) {
    this.socket = null;
    this.baseUrl = baseUrl;
    this.gameHandlers = new Map();
  }

  connect(playerId, playerName) {
    return new Promise((resolve, reject) => {
      this.socket = io(this.baseUrl, {
        query: {
          playerId,
          playerName
        },
        transports: ['websocket']
      });

      this.socket.on('connect', () => {
        console.log('Connected to multiplayer server');
        this.setupEventHandlers();
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });
    });
  }

  setupEventHandlers() {
    // Game state updates
    this.socket.on('gameStateUpdate', (gameState) => {
      const handler = this.gameHandlers.get('gameStateUpdate');
      if (handler) handler(gameState);
    });

    // Player turn updates
    this.socket.on('playerTurn', (playerData) => {
      const handler = this.gameHandlers.get('playerTurn');
      if (handler) handler(playerData);
    });

    // Dice roll updates
    this.socket.on('diceRolled', (diceData) => {
      const handler = this.gameHandlers.get('diceRolled');
      if (handler) handler(diceData);
    });

    // Score updates
    this.socket.on('scoreUpdate', (scoreData) => {
      const handler = this.gameHandlers.get('scoreUpdate');
      if (handler) handler(scoreData);
    });
  }

  on(event, handler) {
    this.gameHandlers.set(event, handler);
  }

  // Game actions
  requestGame(targetPlayerId) {
    this.socket.emit('requestGame', targetPlayerId);
  }

  acceptGame(requestingPlayerId) {
    this.socket.emit('acceptGame', requestingPlayerId);
  }

  rejectGame(requestingPlayerId) {
    this.socket.emit('rejectGame', requestingPlayerId);
  }

  rollDice(gameId, diceValues) {
    this.socket.emit('rollDice', { gameId, diceValues });
  }

  submitScore(gameId, category, score) {
    this.socket.emit('submitScore', { gameId, category, score });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

const multiplayerServiceInstance = new MultiplayerService('https://yahtzee-backend-621359075899.us-east1.run.app');

export default multiplayerServiceInstance;