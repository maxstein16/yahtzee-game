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
      console.log('Connected to WebSocket server');
      this.connectionHandlers.forEach(handler => handler(true));
    });

    this.socket.on('chat_history', (messages) => {
      console.log('Received chat history:', messages);
      this.messageHandlers.forEach(handler => 
        messages.forEach(msg => handler(msg))
      );
    });

    this.socket.on('chat_message', (message) => {
      console.log('Received new message:', message);
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.connectionHandlers.forEach(handler => handler(false));
    });
  }

  sendMessage(message) {
    if (this.socket?.connected) {
      console.log('Sending message:', message);
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
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
  }
}

export const chatService = new WebSocketService();