// src/services/lobbyState.js

export const initialGameState = {
    gameId: null,
    isNewGame: false,
    isInitializing: false,
    shouldResetScores: false,
    isLoading: true,
    gameMode: 'singleplayer',
    isChatVisible: false
  };
  
  export const initialPlayerState = {
    diceValues: [1, 1, 1, 1, 1],
    selectedDice: [],
    playerCategories: [],
    playerTotal: 0,
    currentScores: {},
    rollCount: 0,
    isRolling: false,
    hasYahtzee: false,
    yahtzeeBonus: 0,
    upperSectionTotal: 0,
    upperSectionBonus: 0
  };
  
  export const initialMultiplayerState = {
    showMultiplayerLobby: false,
    availablePlayers: [],
    pendingRequests: [],
    isMyTurn: false,
    opponent: null
  };
  
  export const initialOpponentState = {
    categories: [],
    dice: [1, 1, 1, 1, 1],
    score: 0,
    rollCount: 0,
    isOpponentTurn: false,
    lastCategory: null,
    turnScore: 0
  };
  
  export function createGameStateManager(setState) {
    return {
      resetOpponentTurn: () => {
        setState(prev => ({
          ...prev,
          opponentState: {
            ...prev.opponentState,
            isOpponentTurn: false,
            rollCount: 0,
            dice: [1, 1, 1, 1, 1]
          }
        }));
      },
  
      updatePlayerScores: (scores) => {
        setState(prev => ({
          ...prev,
          playerTotal: scores.total,
          upperSectionTotal: scores.upperTotal,
          upperSectionBonus: scores.upperBonus,
          yahtzeeBonus: scores.yahtzeeBonus,
          hasYahtzee: scores.hasYahtzee
        }));
      },
  
      updateOpponentState: (newState) => {
        setState(prev => ({
          ...prev,
          opponentState: {
            ...prev.opponentState,
            ...newState
          }
        }));
      }
    };
  }