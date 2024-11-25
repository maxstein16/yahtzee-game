const express = require('express');
const router = express.Router();
const gameRoutes = require('./gameRoutes');
const turnRoutes = require('./turnRoutes');
const chatRoutes = require('./chatRoutes');
const playerRoutes = require('./playerRoutes');

module.exports = (wss) => {
  router.use(gameRoutes);
  router.use(turnRoutes);
  router.use(chatRoutes);
  router.use(playerRoutes);
  return router;
};
