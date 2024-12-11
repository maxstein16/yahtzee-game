// services/gamePollingService.js
import API from '../utils/api';

const POLLING_INTERVAL = 30000; // 30 seconds

export class GamePollingService {
  constructor() {
    this.pollingInterval = null;
    this.gameId = null;
    this.callbacks = {
      onGameUpdate: null,
      onTurnChange: null,
      onGameEnd: null
    };
  }

  startPolling(gameId, callbacks) {
    this.gameId = gameId;
    this.callbacks = { ...this.callbacks, ...callbacks };

    this.pollingInterval = setInterval(async () => {
      try {
        // Get latest game state
        const gameState = await API.getGameById(this.gameId);
        
        // Get current turn state
        const turnState = await API.getLatestTurn(this.gameId);
        
        // Get dice state
        const diceState = await API.getGameDice(this.gameId);

        const gameUpdate = {
          ...gameState,
          currentTurn: turnState,
          dice: diceState
        };

        // Notify callback handlers
        if (this.callbacks.onGameUpdate) {
          this.callbacks.onGameUpdate(gameUpdate);
        }

        // Check for turn changes
        if (turnState.turnCompleted && this.callbacks.onTurnChange) {
          this.callbacks.onTurnChange(turnState);
        }

        // Check for game end
        if (gameState.status === 'finished' && this.callbacks.onGameEnd) {
          this.callbacks.onGameEnd(gameState);
          this.stopPolling();
        }

      } catch (error) {
        console.error('Polling error:', error);
      }
    }, POLLING_INTERVAL);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

const gamePollingServiceInstance = new GamePollingService();

export default gamePollingServiceInstance;