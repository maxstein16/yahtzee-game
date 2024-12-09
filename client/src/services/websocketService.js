// src/services/websocketChatService.js
import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
  }

  connect(gameId, playerId, playerName) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io('https://yahtzee-backend-621359075899.us-east1.run.app', {
      query: { 
        gameId, 
        playerId,
        playerName
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connectionHandlers.forEach(handler => handler(true));
      
      // Request previous messages when connecting
      this.socket.emit('get_messages', { gameId });
    });

    this.socket.on('disconnect', () => {
      this.connectionHandlers.forEach(handler => handler(false));
    });

    this.socket.on('chat_message', (message) => {
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('chat_history', (messages) => {
      if (Array.isArray(messages)) {
        messages.forEach(message => {
          this.messageHandlers.forEach(handler => handler(message));
        });
      }
    });
  }

  sendMessage(message) {
    if (this.socket?.connected) {
      this.socket.emit('chat_message', message);
      return true;
    }
    return false;
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnectionChange(handler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const chatService = new WebSocketService();