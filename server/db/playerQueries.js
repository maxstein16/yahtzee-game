const mysql = require('mysql2/promise');
const { Connector } = require('@google-cloud/cloud-sql-connector');

// Initialize the Cloud SQL connector
const connector = new Connector();

// Helper function to execute SQL queries
const runSQL = async (sql, data) => {
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
    ipType: 'PUBLIC', // Adjust to 'PRIVATE' if using private IPs
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

// Create a new player
async function createPlayer(username, password, name) {
  const passwordHash = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO player (username, password_hash, name, score)
    VALUES (?, ?, ?, ?);
  `;
  const values = [username, passwordHash, name, 0];
  const result = await runSQL(query, values);

  // Confirm insertion by retrieving the newly inserted player
  const selectQuery = `
    SELECT * FROM player
    WHERE username = ?
    LIMIT 1;
  `;
  const [newPlayer] = await runSQL(selectQuery, [username]);
  return newPlayer;
}

// Login a player
async function loginPlayer(username, password) {
  const query = `
    SELECT * FROM player 
    WHERE username = ?;
  `;
  const result = await runSQL(query, [username]);

  if (result.length === 0) {
    throw new Error('Player not found');
  }

  const player = result[0];
  const isPasswordValid = await bcrypt.compare(password, player.password_hash);

  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  // Return player data without the password hash
  const { password_hash, ...playerWithoutPassword } = player;
  return playerWithoutPassword;
}

// Get a player by ID
async function getPlayerById(playerId) {
  const query = `
    SELECT * FROM player
    WHERE player_id = ?;
  `;
  const result = await runSQL(query, [playerId]);

  if (result.length === 0) {
    throw new Error(`Player with ID ${playerId} not found`);
  }

  return result[0];
}

// Update a player's score
async function updatePlayerScore(playerId, score) {
  const query = `
    UPDATE player
    SET score = ?
    WHERE player_id = ?;
  `;
  const values = [score, playerId];
  await runSQL(query, values);

  // Confirm the update
  const selectQuery = `
    SELECT * FROM player
    WHERE player_id = ?;
  `;
  const [updatedPlayer] = await runSQL(selectQuery, [playerId]);
  return updatedPlayer;
}

// Delete a player
async function deletePlayer(playerId) {
  // Retrieve player data before deleting
  const selectQuery = `
    SELECT * FROM player
    WHERE player_id = ?;
  `;
  const result = await runSQL(selectQuery, [playerId]);

  if (result.length === 0) {
    throw new Error(`Player with ID ${playerId} not found`);
  }

  const query = `
    DELETE FROM player
    WHERE player_id = ?;
  `;
  await runSQL(query, [playerId]);

  return result[0]; // Return the deleted player data
}

module.exports = {
  createPlayer,
  loginPlayer,
  getPlayerById,
  updatePlayerScore,
  deletePlayer,
};
