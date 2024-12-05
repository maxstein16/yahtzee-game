const express = require('express');
const router = express.Router();
const { createGame, getGameById, updateGame, deleteGame } = require('../db/gameQueries');

// POST route for creating a new game
router.post('/game', async (req, res) => {
  try {
    const { status = 'pending', round = 0 } = req.body;
    const newGame = await createGame(status, round);
    res.json(newGame);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET route for retrieving a game by ID
router.get('/game/:id', async (req, res) => {
  try {
    const game = await getGameById(req.params.id);
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT route for updating a game
router.put('/game/:id', async (req, res) => {
  try {
    const { status, round } = req.body;
    const updatedGame = await updateGame(req.params.id, status, round);
    res.json(updatedGame);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE route for deleting a game
router.delete('/game/:id', async (req, res) => {
  try {
    await deleteGame(req.params.id);
    res.json({ message: 'Game deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT route to start a game (update status to 'in_progress')
router.put('/game/:id/start', async (req, res) => {
  try {
    const game = await updateGame(req.params.id, 'in_progress', 1);
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gameplayer', async (req, res) => {
  try {
    const { gameId, playerId } = req.body;
    
    if (!gameId || !playerId) {
      return res.status(400).json({ error: 'Game ID and Player ID are required' });
    }

    const result = await addPlayerToGame(gameId, playerId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
