import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
    this.playerJoinHandlers = new Set();
    this.playerLeaveHandlers = new Set();
  }

  connect(gameId, playerId, playerName) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io('https://yahtzee-backend-621359075899.us-east1.run.app', {
      query: {
        gameId,
        playerId,
        playerName,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.connectionHandlers.forEach((handler) => handler(true));
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.connectionHandlers.forEach((handler) => handler(false));
    });

    this.socket.on('chat_message', (message) => {
      console.log('Received message:', message);
      this.messageHandlers.forEach((handler) => handler(message));
    });

    this.socket.on('player_joined', (data) => {
      console.log('Player joined:', data);
      this.playerJoinHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('player_left', (data) => {
      console.log('Player left:', data);
      this.playerLeaveHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
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

  onPlayerJoined(handler) {
    this.playerJoinHandlers.add(handler);
    return () => this.playerJoinHandlers.delete(handler);
  }

  onPlayerLeft(handler) {
    this.playerLeaveHandlers.add(handler);
    return () => this.playerLeaveHandlers.delete(handler);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
    this.playerJoinHandlers.clear();
    this.playerLeaveHandlers.clear();
  }
}

export const chatService = new WebSocketService();