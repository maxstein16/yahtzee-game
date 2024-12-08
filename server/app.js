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

// app.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const routes = require('./routes');

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'https://yahtzee.maxstein.info',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // CORS preflight cache time in seconds
};

// Apply CORS configuration
app.use(cors(corsOptions));

// Additional headers for CORS
app.use((req, res, next) => {
  // Required headers for Cloud Run
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something broke!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Game Server API');
});

app.use('/api', routes());

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports = { app };