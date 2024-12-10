// src/services/multiplayerService.js

import { message, Modal } from 'antd';
import { chatService } from './websocketService';

export function createMultiplayerHandlers({
  currentPlayer,
  availablePlayers,
  setGameId,
  setGameMode,
  setIsMyTurn,
  setOpponent,
  setShowMultiplayerLobby,
  setAvailablePlayers,
  setPendingRequests,
  initializeGame,
  handleNewGame
}) {
  return {
    setupWebSocketHandlers() {
      const handlers = {
        available_players: (players) => {
          setAvailablePlayers(
            players.filter(p => p.id !== currentPlayer.player_id)
          );
        },

        game_request: (request) => {
          Modal.confirm({
            title: 'Game Request',
            content: `${request.playerName} wants to play a game with you!`,
            okText: 'Accept',
            cancelText: 'Decline',
            onOk: () => this.handleAcceptGame(request),
            onCancel: () => this.handleDeclineGame(request)
          });
        },

        game_start: this.handleGameStart,
        request_response: this.handleRequestResponse,
        opponent_move: this.handleOpponentMove,
        opponent_disconnect: this.handleOpponentDisconnect
      };

      // Set up listeners
      Object.entries(handlers).forEach(([event, handler]) => {
        chatService.on(event, handler);
      });

      // Return cleanup function
      return () => {
        Object.keys(handlers).forEach(event => {
          chatService.off(event);
        });
      };
    },

    async handleAcceptGame(request) {
      chatService.emit('accept_game_request', {
        requestId: request.requestId,
        playerId: currentPlayer.player_id,
        opponentId: request.playerId
      });
    },

    handleDeclineGame(request) {
      chatService.emit('decline_game_request', {
        requestId: request.requestId,
        playerId: currentPlayer.player_id,
        opponentId: request.playerId
      });
    },

    async handleGameStart({ gameId: newGameId, opponentId, isFirstPlayer }) {
      try {
        const result = await initializeGame(currentPlayer, 'multiplayer', setGameId, null, {
          opponentId,
          isFirstPlayer
        });

        if (result.success) {
          setGameId(newGameId);
          setGameMode('multiplayer');
          setIsMyTurn(isFirstPlayer);
          setOpponent(availablePlayers.find(p => p.id === opponentId));
          setShowMultiplayerLobby(false);
          message.success('Multiplayer game started!');
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Error starting multiplayer game:', error);
        message.error('Failed to start multiplayer game');
      }
    },

    handleRequestResponse(response) {
      setPendingRequests(prev => 
        prev.filter(id => id !== response.playerId)
      );

      if (response.accepted) {
        message.success(`${response.playerName} accepted your game request!`);
      } else {
        message.error(`${response.playerName} declined your game request`);
      }
    },

    handleOpponentDisconnect() {
      const opponent = availablePlayers.find(p => p.id === currentPlayer.opponentId);
      if (opponent) {
        message.error(`${opponent.name} has disconnected`);
        Modal.confirm({
          title: 'Opponent Disconnected',
          content: 'Would you like to end the game?',
          onOk: () => handleNewGame('singleplayer')
        });
      }
    }
  };
}