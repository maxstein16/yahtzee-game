const http = require('http');
const { app, wss } = require('./app'); // Assuming 'app' contains your Express app or other HTTP server setup

// Use the PORT environment variable provided by Cloud Run, with a default for local development
const port = process.env.PORT || 8080;
const server = http.createServer(app);

// Handle WebSocket upgrade request
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request); // Emit a connection event for the WebSocket
  });
});

// Start the server and log the port
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
