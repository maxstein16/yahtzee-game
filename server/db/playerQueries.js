const pool = require('../db');
const bcrypt = require('bcrypt');

async function createPlayer(username, password, name) {
  const passwordHash = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO player (username, password_hash, name, score)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const res = await pool.query(query, [username, passwordHash, name, 0]);
  return res.rows[0];
}

async function loginPlayer(username, password) {
  const query = `
    SELECT * FROM player 
    WHERE username = $1;
  `;
  const res = await pool.query(query, [username]);

  if (res.rows.length === 0) {
    console.log('Player not found');
    throw new Error('Player not found');
  }

  const player = res.rows[0];
  console.log('Player found:', player);

  const isPasswordValid = await bcrypt.compare(password, player.password_hash);
  console.log('Password valid:', isPasswordValid);

  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  const { password_hash, ...playerWithoutPassword } = player;
  return playerWithoutPassword;
}

// Get a player by ID
async function getPlayerById(playerId) {
  const query = `
    SELECT * FROM player 
    WHERE player_id = $1;
  `;
  const res = await pool.query(query, [playerId]);
  return res.rows[0];
}

// Update a player's score
async function updatePlayerScore(playerId, score) {
  const query = `
    UPDATE player 
    SET score = $1 
    WHERE player_id = $2 
    RETURNING *;
  `;
  const values = [score, playerId];
  const res = await pool.query(query, values);
  return res.rows[0];
}

// Delete a player
async function deletePlayer(playerId) {
  const query = `
    DELETE FROM player 
    WHERE player_id = $1;
  `;
  await pool.query(query, [playerId]);
}

module.exports = {
  createPlayer,
  loginPlayer,
  getPlayerById,
  updatePlayerScore,
  deletePlayer
};
