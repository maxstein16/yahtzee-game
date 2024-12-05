const http = require('http');
const { app } = require('./app'); // Assuming 'app' contains your Express app or other HTTP server setup

// Use the PORT environment variable provided by Cloud Run, with a default for local development
const port = process.env.PORT || 8080;
const server = http.createServer(app);

// Start the server and log the port
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
