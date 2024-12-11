const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'https://yahtzee.maxstein.info',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Connection', 
    'Upgrade',
    'Sec-WebSocket-Key',
    'Sec-WebSocket-Version'
  ],
  credentials: true,
  maxAge: 86400
};

// Apply CORS configuration
app.use(cors(corsOptions));

// Additional headers for CORS and WebSocket
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Connection, Upgrade, Sec-WebSocket-Key, Sec-WebSocket-Version'
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );

  // Allow WebSocket upgrade
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    res.header('Connection', 'Upgrade');
    res.header('Upgrade', 'websocket');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something broke!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the Game Server API');
});

app.use('/api', routes());

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports = { app };