const express = require('express');
const router = express.Router();
const { createGame, getGameById, updateGame, deleteGame, getActiveGameForPlayer } = require('../db/gameQueries');
const { createTurn } = require('../db/turnQueries');

// POST route for creating a new game
router.post('/game', async (req, res) => {
  console.log('Game creation request received:', req.body);

  const { status, round, player1Id, player2Id } = req.body;
  if (!player1Id || !player2Id) {
    return res.status(400).json({ error: 'Both player IDs are required' });
  }

  try {
    // Create new game with both players
    const newGame = await createGame(
      status || 'pending', 
      round || 0, 
      player1Id,
      player2Id
    );

    // Also initialize the game state
    await createTurn(newGame.game.game_id, player1Id, [1,1,1,1,1], 0, 0, false);

    res.status(201).json(newGame);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: error.message });
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

router.put('/game/:id/end', async (req, res) => {
  try {
    const game = await updateGame(req.params.id, 'finished', 0);
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/game/active/:playerId', async (req, res) => {
  try {
    const activeGame = await getActiveGameForPlayer(req.params.playerId);
    res.json(activeGame);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add this route to your API
router.get('/game/:id/dice', async (req, res) => {
  try {
    const gameId = req.params.id;
    const game = await getGameById(gameId);
    res.json({ 
      dice: game.currentDice,
      lastRollTime: game.lastRollTime 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
