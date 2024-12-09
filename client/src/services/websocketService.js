import { io } from 'socket.io-client';

const WS_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
  }

  connect(gameId, playerId) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(WS_BASE_URL, {
      query: { gameId, playerId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connectionHandlers.forEach(handler => handler(true));
    });

    this.socket.on('disconnect', () => {
      this.connectionHandlers.forEach(handler => handler(false));
    });

    this.socket.on('chat_message', (message) => {
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('player_joined', (data) => {
      console.log('Player joined:', data);
    });

    this.socket.on('player_left', (data) => {
      console.log('Player left:', data);
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