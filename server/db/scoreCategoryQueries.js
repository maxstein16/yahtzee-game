const mysql = require('mysql2/promise');
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

  const [result] = await pool.execute(sql, data);
  return result;
}

async function createScoreCategory(name, maxScore, playerId) {
  const query = `
    INSERT INTO scorecategory (name, max_score, player_id, score, is_submitted) 
    VALUES (?, ?, ?, NULL, false);
  `;
  const result = await runSQL(query, [name, maxScore, playerId]);
  return result.insertId;
}

async function getPlayerCategories(playerId) {
  const query = `
    SELECT category_id, name, max_score, score, is_submitted 
    FROM scorecategory 
    WHERE player_id = ?;
  `;
  return await runSQL(query, [playerId]);
}

async function updateScoreCategory(categoryId, score) {
  const query = `
    UPDATE scorecategory 
    SET score = ?, is_submitted = true 
    WHERE category_id = ?;
  `;
  const result = await runSQL(query, [score, categoryId]);
  return result.affectedRows > 0;
}

async function initializePlayerCategories(playerId) {
  const existingCategories = await getPlayerCategories(playerId);
  if (existingCategories && existingCategories.length > 0) {
    return true;
  }

  const categories = [
    ['ones', 5],
    ['twos', 10],
    ['threes', 15],
    ['fours', 20],
    ['fives', 25],
    ['sixes', 30],
    ['threeOfAKind', 30],
    ['fourOfAKind', 30],
    ['fullHouse', 25],
    ['smallStraight', 30],
    ['largeStraight', 40],
    ['yahtzee', 50],
    ['chance', 30]
  ];

  try {
    for (const [name, maxScore] of categories) {
      const query = `
        INSERT INTO scorecategory (name, max_score, player_id, score, is_submitted) 
        VALUES (?, ?, ?, NULL, false);
      `;
      await runSQL(query, [name, maxScore, playerId]);
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize player categories:', error);
    return false;
  }
}

async function resetPlayerCategories(playerId) {
  const query = `
    UPDATE scorecategory 
    SET score = NULL, is_submitted = false 
    WHERE player_id = ?;
  `;
  const result = await runSQL(query, [playerId]);
  return result.affectedRows > 0;
}

async function getPlayerCategory(playerId, categoryName) {
  const query = `
    SELECT * 
    FROM scorecategory 
    WHERE player_id = ? 
    AND name = ?;
  `;
  const results = await runSQL(query, [playerId, categoryName]);
  return results[0];
}

async function getPlayerTotalScore(playerId) {
  const query = `
    SELECT COALESCE(SUM(score), 0) as total 
    FROM scorecategory 
    WHERE player_id = ? 
    AND is_submitted = true;
  `;
  const result = await runSQL(query, [playerId]);
  return result[0].total;
}

module.exports = {
  createScoreCategory,
  getPlayerCategories,
  updateScoreCategory,
  initializePlayerCategories,
  resetPlayerCategories,
  getPlayerCategory,
  getPlayerTotalScore
};