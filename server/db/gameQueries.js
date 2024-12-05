const mysql = require("mysql2/promise");
const { Connector } = require('@google-cloud/cloud-sql-connector');

// Initialize database pool
const connector = new Connector();
const runSQL = async (sql, data) => {
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
    ipType: "PUBLIC"
  });

  const pool = await mysql.createPool({
    ...clientOpts,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Execute the query
  const [result] = await pool.execute(sql, data); // Corrected to use execute()
  return result;
}

// Create a new game
async function createGame(status, round) {
  // Insert the new game into the database
  const query = `
    INSERT INTO game (status, round, created_at)
    VALUES (?, ?, NOW());
  `;
  const values = [status, round];
  const insertResult = await runSQL(query, values);
  console.log("Insert result:", insertResult); // Log the result of the insert query

  // Now confirm the insertion by selecting the most recently inserted game
  const selectQuery = `
    SELECT * FROM game ORDER BY created_at DESC LIMIT 1;
  `;
  const selectResult = await runSQL(selectQuery);
  console.log("Select result:", selectResult);  // Log the result of the select query

  if (selectResult.length === 0) {
    console.error("Game not found after insertion");
    throw new Error("Game not found after insertion");
  }

  return selectResult[0];  // Return the inserted game
}

// Retrieve a game by ID
async function getGameById(id) {
  const query = `
    SELECT * FROM game
    WHERE game_id = ?;
  `;
  try {
    const result = await runSQL(query, [id]);
    console.log("Get game by ID result:", result); // Log the result
    if (result.length === 0) {
      throw new Error(`Game with ID ${id} not found`);
    }
    return result[0]; // Return the game with the given ID
  } catch (error) {
    console.error("Error fetching game by ID:", error.message);
    throw error;
  }
}

async function getLastGameByPlayerId(playerId) {
  const query = `
    SELECT g.* 
    FROM game g
    JOIN gameplayer gp ON g.game_id = gp.game_id
    WHERE gp.player_id = ?
    ORDER BY g.created_at DESC
    LIMIT 1;
  `;
  
  try {
    const result = await runSQL(query, [playerId]);
    if (result.length === 0) {
      return null;
    }
    return result[0];
  } catch (error) {
    console.error("Error fetching last game:", error.message);
    throw error;
  }
}

async function addPlayerToGame(gameId, playerId) {
  // First check if the relationship already exists
  const checkQuery = `
    SELECT * FROM gameplayer 
    WHERE game_id = ? AND player_id = ?;
  `;
  
  const existingEntry = await runSQL(checkQuery, [gameId, playerId]);
  
  if (existingEntry.length > 0) {
    return existingEntry[0];
  }

  // If not exists, create new entry
  const insertQuery = `
    INSERT INTO gameplayer (game_id, player_id)
    VALUES (?, ?);
  `;

  await runSQL(insertQuery, [gameId, playerId]);
  
  // Return the newly created relationship
  const result = await runSQL(checkQuery, [gameId, playerId]);
  return result[0];
}

// Update a game's status or round
async function updateGame(id, status, round) {
  const query = `
    UPDATE game
    SET status = ?, round = ?
    WHERE game_id = ?;
  `;
  const values = [status, round, id];
  try {
    await runSQL(query, values);

    // Retrieve the updated game by its ID
    const selectQuery = `
      SELECT * FROM game
      WHERE game_id = ?;
    `;
    const result = await runSQL(selectQuery, [id]);
    console.log("Update game result:", result); // Log the result
    if (result.length === 0) {
      throw new Error(`Game with ID ${id} not found after update`);
    }
    return result[0]; // Return the updated game
  } catch (error) {
    console.error("Error updating game:", error.message);
    throw error;
  }
}

// Delete a game by ID
async function deleteGame(id) {
  // First, retrieve the game to return it later
  const selectQuery = `
    SELECT * FROM game
    WHERE game_id = ?;
  `;
  try {
    const result = await runSQL(selectQuery, [id]);
    console.log("Game to delete:", result); // Log the game to be deleted

    if (result.length === 0) {
      throw new Error(`Game with ID ${id} not found`);
    }

    // Now delete the game
    const query = `
      DELETE FROM game
      WHERE game_id = ?;
    `;
    await runSQL(query, [id]);
    return result[0]; // Return the deleted game
  } catch (error) {
    console.error("Error deleting game:", error.message);
    throw error;
  }
}

// Add a player to a game
async function addPlayerToGame(gameId, playerId) {
  const query = `
    INSERT INTO gameplayer (game_id, player_id) 
    VALUES (?, ?);
  `;
  const values = [gameId, playerId];
  try {
    await runSQL(query, values);

    // Retrieve the inserted game-player association
    const selectQuery = `
      SELECT * FROM gameplayer
      WHERE game_id = ? AND player_id = ?;
    `;
    const result = await runSQL(selectQuery, [gameId, playerId]);
    console.log("Add player result:", result); // Log the result
    return result[0]; // Return the inserted game-player association
  } catch (error) {
    console.error("Error adding player to game:", error.message);
    throw error;
  }
}

// Get all players in a game
async function getPlayersInGame(gameId) {
  const query = `
    SELECT p.player_id, p.username, p.name, p.score
    FROM player p
    INNER JOIN gameplayer gp ON p.player_id = gp.player_id
    WHERE gp.game_id = ?;
  `;
  try {
    const result = await runSQL(query, [gameId]);
    console.log("Get players result:", result); // Log the result
    return result; // Return all players in the game
  } catch (error) {
    console.error("Error fetching players in game:", error.message);
    throw error;
  }
}

// Remove a player from a game
async function removePlayerFromGame(gameId, playerId) {
  // First, retrieve the player-game association to return it later
  const selectQuery = `
    SELECT * FROM gameplayer 
    WHERE game_id = ? AND player_id = ?;
  `;
  try {
    const result = await runSQL(selectQuery, [gameId, playerId]);
    console.log("Player to remove:", result); // Log the player to be removed

    if (result.length === 0) {
      throw new Error(`Player with ID ${playerId} not found in game with ID ${gameId}`);
    }

    // Now delete the player-game association
    const deleteQuery = `
      DELETE FROM gameplayer 
      WHERE game_id = ? AND player_id = ?;
    `;
    await runSQL(deleteQuery, [gameId, playerId]);

    return result[0]; // Return the removed player-game association
  } catch (error) {
    console.error("Error removing player from game:", error.message);
    throw error;
  }
}

module.exports = {
  createGame,
  getGameById,
  updateGame,
  deleteGame,
  addPlayerToGame,
  getPlayersInGame,
  removePlayerFromGame,
  getLastGameByPlayerId
};
