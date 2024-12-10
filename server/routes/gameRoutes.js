const express = require('express');
const router = express.Router();
const {
  getAllGames,
  getGamesByPlayerId,
  createGame,
  getGameById,
  updateGame,
  deleteGame,
  addPlayerToGame,
  getPlayersInGame,
  removePlayerFromGame
} = require('../db/gameQueries');

// POST route for creating a new game
router.post('/game', async (req, res) => {
  const { status, round, player1Id, player2Id } = req.body;

  // Ensure both players are provided
  if (!player1Id || !player2Id) {
    return res.status(400).json({ error: 'Both player1Id and player2Id are required' });
  }

  try {
    // Create the game
    const newGame = await createGame(status || 'pending', round || 0, player1Id);

    // Add both players to the game
    await addPlayerToGame(newGame.game_id, player1Id);
    await addPlayerToGame(newGame.game_id, player2Id);

    res.status(201).json({
      message: 'Game created successfully',
      game: newGame,
    });
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

// Get all games
router.get('/games', async (req, res) => {
  try {
    const games = await getAllGames();
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get games by player ID
router.get('/games/player/:playerId', async (req, res) => {
  try {
    const games = await getGamesByPlayerId(req.params.playerId);
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a player to a game
router.post('/game/:gameId/player/:playerId', async (req, res) => {
  try {
    const gamePlayer = await addPlayerToGame(req.params.gameId, req.params.playerId);
    res.json(gamePlayer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get players in a game
router.get('/game/:gameId/players', async (req, res) => {
  try {
    const players = await getPlayersInGame(req.params.gameId);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a player from a game
router.delete('/game/:gameId/player/:playerId', async (req, res) => {
  try {
    const removedPlayer = await removePlayerFromGame(req.params.gameId, req.params.playerId);
    res.json({ message: "Player removed successfully", player: removedPlayer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
