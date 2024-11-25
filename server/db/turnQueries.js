const pool = require('../db');

// Create a new turn
async function createTurn(gameId, playerId, dice, rerolls = 0, turnScore = 0, turnCompleted = false) {
  const query = `
    INSERT INTO turn (game_id, player_id, dice, rerolls, turn_score, turn_completed) 
    VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING *;
  `;
  const values = [gameId, playerId, dice, rerolls, turnScore, turnCompleted];
  const res = await pool.query(query, values);
  return res.rows[0];
}

// Get a turn by ID
async function getTurnById(turnId) {
  const query = `
    SELECT * FROM turn 
    WHERE turn_id = $1;
  `;
  const res = await pool.query(query, [turnId]);
  return res.rows[0];
}

// Update a turn's score and completion status
async function updateTurn(turnId, turnScore, turnCompleted) {
  const query = `
    UPDATE turn 
    SET turn_score = $1, turn_completed = $2 
    WHERE turn_id = $3 
    RETURNING *;
  `;
  const values = [turnScore, turnCompleted, turnId];
  const res = await pool.query(query, values);
  return res.rows[0];
}

// Delete a turn
async function deleteTurn(turnId) {
  const query = `
    DELETE FROM turn 
    WHERE turn_id = $1;
  `;
  await pool.query(query, [turnId]);
}

module.exports = {
  createTurn,
  getTurnById,
  updateTurn,
  deleteTurn
};
