const express = require('express');
const router = express.Router();
const gameRoutes = require('./gameRoutes');
const turnRoutes = require('./turnRoutes');
const chatRoutes = require('./chatRoutes');
const playerRoutes = require('./playerRoutes');
const scoreCategoryRoutes = require('./scoreCategoryRoutes')

module.exports = (wss) => {
  router.use(gameRoutes);
  router.use(turnRoutes);
  router.use(chatRoutes);
  router.use(playerRoutes);
  router.use(scoreCategoryRoutes)
  return router;
};
