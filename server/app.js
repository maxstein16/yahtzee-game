const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the Game Server API');
});

app.use('/api', routes());

module.exports = { app };

