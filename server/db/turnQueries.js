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
  try {
    console.log('Querying turn for gameId:', gameId, 'playerId:', playerId);

    const query = `
      SELECT turn_id, game_id, player_id, dice, rerolls, turn_score, turn_completed
      FROM turn 
      WHERE game_id = ? AND player_id = ? AND turn_completed = FALSE
      ORDER BY turn_id DESC LIMIT 1;
    `;

    const result = await runSQL(query, [gameId, playerId]);

    console.log('Query result:', result);

    if (result.length === 0) {
      return null;
    }

    const turn = result[0];
    turn.dice = JSON.parse(turn.dice); // Ensure `dice` is parsed correctly
    return turn;
  } catch (error) {
    console.error('Error in getLatestTurn:', error.message);
    throw error;
  }
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
    Number(rerolls), 
    Number(turnScore),
    Boolean(turnCompleted),
    Number(gameId), 
    Number(playerId)
  ];
  
  return await runSQL(query, values);
}

async function submitTurn(gameId, playerId, categoryId, score) {
  try {
    // Update the turn
    const turnQuery = `
      UPDATE turn
      SET 
        turn_score = ?,
        turn_completed = TRUE
      WHERE game_id = ? 
      AND player_id = ? 
      AND turn_completed = FALSE
      ORDER BY turn_id DESC
      LIMIT 1;
    `;
    await runSQL(turnQuery, [Number(score), Number(gameId), Number(playerId)]);

    // Update the score category
    const categoryQuery = `
      UPDATE scorecategory
      SET 
        score = ?,
        is_submitted = TRUE
      WHERE category_id = ? 
      AND player_id = ?;
    `;
    await runSQL(categoryQuery, [Number(score), Number(categoryId), Number(playerId)]);

    return {
      gameId: Number(gameId),
      playerId: Number(playerId),
      categoryId: Number(categoryId),
      score: Number(score),
      completed: true
    };
  } catch (error) {
    console.error('Error in submitTurn:', error);
    throw new Error(`Failed to submit turn: ${error.message}`);
  }
}

module.exports = {
  createTurn,
  getLatestTurn,
  deleteTurn,
  submitTurn,
  updateTurn
};