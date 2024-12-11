// app.js
const express = require('express');
const cors = require('cors');

const app = express();

// Define allowed origins
const allowedOrigins = [
  'https://yahtzee.maxstein.info',
  'http://localhost:3000'
];

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS configuration before any routes
app.use(cors(corsOptions));

// Remove the additional CORS middleware and handle OPTIONS requests globally
app.options('*', cors(corsOptions));

// Add security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');
  
  // Only needed for preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  
  next();
});

// Body parser middleware - place after CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('./routes', routes());

// Error handling for CORS
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed'
    });
  } else {
    next(err);
  }
});

module.exports = { app };