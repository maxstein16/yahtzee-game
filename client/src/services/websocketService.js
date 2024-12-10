import io from 'socket.io-client';
class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
    this.currentRoom = null;
  }

  connect(gameId, playerId, playerName) {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting existing connection');
      this.socket.disconnect();
    }

    console.log('[WebSocket] Connecting:', { gameId, playerId, playerName });

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

    this.currentRoom = `game:${gameId}`;

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected:', {
        socketId: this.socket.id,
        room: this.currentRoom
      });
      this.connectionHandlers.forEach(handler => handler(true));
    });

    this.socket.on('chat_history', (messages) => {
      console.log('[WebSocket] Received chat history:', {
        messageCount: messages.length,
        room: this.currentRoom
      });
      this.messageHandlers.forEach(handler => 
        messages.forEach(msg => handler(msg))
      );
    });

    this.socket.on('chat_message', (message) => {
      console.log('[WebSocket] Received message:', {
        message,
        room: this.currentRoom
      });
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      this.connectionHandlers.forEach(handler => handler(false));
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });
  }

  sendMessage(message) {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot send message: not connected');
      return false;
    }

    console.log('[WebSocket] Sending message:', {
      message,
      room: this.currentRoom
    });
    this.socket.emit('chat_message', message);
    return true;
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
      console.log('[WebSocket] Closing connection');
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoom = null;
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
  }
}

export const chatService = new WebSocketService();