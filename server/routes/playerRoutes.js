const express = require('express');
const router = express.Router();
const {
  getAllPlayers,
  getAvailablePlayers,
  createPlayer,
  loginPlayer,
  getPlayerById,
  updatePlayerProfile,
  deletePlayer
} = require('../db/playerQueries');
const bcrypt = require('bcrypt');
const pool = require('../db');

router.post('/players/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    const newPlayer = await createPlayer(username, password, name);
    res.json(newPlayer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/players/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const player = await loginPlayer(username, password);
    res.json(player);
  } catch (err) {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

router.put('/players/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const query = `
      UPDATE player
      SET password_hash = $1
      WHERE player_id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [hashedPassword, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ message: 'Password updated successfully', player: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/players/:id', async (req, res) => {
  try {
    const player = await getPlayerById(req.params.id);
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/players/:id', async (req, res) => {
  try {
    const { name, password } = req.body;
    const updatedPlayer = await updatePlayerProfile(req.params.id, name, password);
    res.json(updatedPlayer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all players
router.get('/players', async (req, res) => {
  try {
    const players = await getAllPlayers();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get available players
router.get('/players/available', async (req, res) => {
  try {
    const players = await getAvailablePlayers();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a player
router.delete('/players/:id', async (req, res) => {
  try {
    const deletedPlayer = await deletePlayer(req.params.id);
    res.json({ message: "Player deleted successfully", player: deletedPlayer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
