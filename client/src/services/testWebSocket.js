const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected to WebSocket');
  ws.send(JSON.stringify({ type: 'TEST', message: 'Hello WebSocket' }));
};

ws.onmessage = (event) => {
  console.log('Message from server:', event.data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket connection closed');
};