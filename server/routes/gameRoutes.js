const express = require('express');
const router = express.Router();
const { createGame, getGameById, updateGame, deleteGame, addPlayerToGame } = require('../db/gameQueries');

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
    const { player_id } = req.body; // Extract player_id from the request body

    if (player_id) {
      await addPlayerToGame(req.params.id, player_id);
    }

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

router.get('/player/:id/game', async (req, res) => {
  try {
    const query = `
      SELECT g.*
      FROM game g
      INNER JOIN gameplayer gp ON g.game_id = gp.game_id
      WHERE gp.player_id = ? AND g.status = 'in_progress';
    `;
    const game = await runSQL(query, [req.params.id]);

    if (game.length === 0) {
      return res.status(404).json({ error: 'No active game found for the player' });
    }

    res.json(game[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/game/:id/player', async (req, res) => {
  try {
    const game = await addPlayerToGame(req.params.id, req.body.playerId);
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/game/player/:playerId/active', async (req, res) => {
  try {
    const activeGame = await getActiveGameByPlayerId(req.params.playerId);
    if (!activeGame) {
      return res.status(404).json({ message: 'No active game found' });
    }
    res.json(activeGame);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
