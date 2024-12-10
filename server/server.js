// server.js
const http = require('http');
const { app } = require('./app');

const port = process.env.PORT || 8080;
const server = http.createServer(app);

// Error handling for server
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${port} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${port} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});