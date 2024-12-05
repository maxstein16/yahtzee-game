const express = require('express');
const router = express.Router();
const gameRoutes = require('./gameRoutes');
const turnRoutes = require('./turnRoutes');
const playerRoutes = require('./playerRoutes');
const scoreCategoryRoutes = require('./scoreCategoryRoutes')

module.exports = () => {
  router.use(gameRoutes);
  router.use(turnRoutes);
  router.use(playerRoutes);
  router.use(scoreCategoryRoutes)
  return router;
};
