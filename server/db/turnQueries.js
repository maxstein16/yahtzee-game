const mysql = require('mysql2/promise');
const { Connector } = require('@google-cloud/cloud-sql-connector');

// Initialize the Cloud SQL connector
const connector = new Connector();

// Helper function to execute SQL queries
const runSQL = async (sql, data) => {
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
    ipType: 'PUBLIC',
  });

  const pool = await mysql.createPool({
    ...clientOpts,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [result] = await pool.execute(sql, data);
  return result;
};

// Create a new turn
async function createTurn(gameId, playerId, dice, rerolls = 0, turnScore = 0, turnCompleted = false) {
  const query = `
    INSERT INTO turn (game_id, player_id, dice, rerolls, turn_score, turn_completed)
    VALUES (?, ?, ?, ?, ?, ?);
  `;
  const values = [gameId, playerId, JSON.stringify(dice), rerolls, turnScore, turnCompleted];
  const result = await runSQL(query, values);
  
  // Fetch and return the newly created turn
  const selectQuery = `
    SELECT * FROM turn
    WHERE turn_id = ?
    LIMIT 1;
  `;
  const [newTurn] = await runSQL(selectQuery, [result.insertId]);
  return newTurn;
}

// Get a turn by ID
async function getLatestTurn(gameId, playerId) {
  const query = `
    SELECT turn_id, game_id, player_id, dice, rerolls, turn_score, turn_completed
    FROM turn 
    WHERE game_id = ? AND player_id = ?
    AND turn_completed = FALSE
    ORDER BY turn_id DESC LIMIT 1;
  `;
  const result = await runSQL(query, [gameId, playerId]);
  
  if (result.length === 0) {
    return null;
  }

  const turn = result[0];
  if (turn.dice) {
    turn.dice = JSON.parse(turn.dice);
  }
  return turn;
}

// Delete a turn
async function deleteTurn(turnId) {
  // Fetch turn before deletion
  const selectQuery = `
    SELECT * FROM turn
    WHERE turn_id = ?;
  `;
  const result = await runSQL(selectQuery, [turnId]);

  if (result.length === 0) {
    throw new Error(`Turn with ID ${turnId} not found`);
  }

  const query = `
    DELETE FROM turn
    WHERE turn_id = ?;
  `;
  await runSQL(query, [turnId]);

  // Return the deleted turn data
  const deletedTurn = result[0];
  deletedTurn.dice = JSON.parse(deletedTurn.dice);
  return deletedTurn;
}

async function updateTurn(gameId, playerId, dice, rerolls, turnScore, turnCompleted) {
  const query = `
    UPDATE turn 
    SET 
      dice = ?,
      rerolls = ?,
      turn_score = ?,
      turn_completed = ?
    WHERE game_id = ? AND player_id = ? 
    AND turn_completed = FALSE
    ORDER BY turn_id DESC LIMIT 1;
  `;
  const values = [
    JSON.stringify(dice), 
    rerolls, 
    turnScore,
    turnCompleted,
    gameId, 
    playerId
  ];
  return await runSQL(query, values);
}

// Submit a turn
async function submitTurn(gameId, playerId, categoryId, score) {
  const query = `
    UPDATE turn
    SET turn_score = ?, turn_completed = TRUE
    WHERE game_id = ? AND player_id = ? 
    AND turn_completed = FALSE
    ORDER BY turn_id DESC
    LIMIT 1;
  `;
  const values = [score, gameId, playerId];
  await runSQL(query, values);

  // Update the score category
  const updateCategoryQuery = `
    UPDATE scorecategory
    SET score = ?
    WHERE category_id = ? AND player_id = ?;
  `;
  await runSQL(updateCategoryQuery, [score, categoryId, playerId]);

  return {
    gameId,
    playerId,
    categoryId,
    score,
    completed: true
  };
}

module.exports = {
  createTurn,
  getLatestTurn,
  deleteTurn,
  submitTurn,
  updateTurn
};