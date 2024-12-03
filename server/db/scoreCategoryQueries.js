const pool = require('../db');

async function createScoreCategory(name, maxScore, playerId) {
  const query = `
    INSERT INTO scorecategory (name, max_score, player_id, score) 
    VALUES (?, ?, ?, 0);
  `;
  const [result] = await pool.query(query, [name, maxScore, playerId]);
  return result.insertId;
}

async function getScoreCategoryById(categoryId) {
  const query = `
    SELECT * FROM scorecategory 
    WHERE category_id = ?;
  `;
  const [rows] = await pool.query(query, [categoryId]);
  return rows[0];
}

async function getPlayerCategories(playerId) {
  const query = `
    SELECT * FROM scorecategory 
    WHERE player_id = ?;
  `;
  const [rows] = await pool.query(query, [playerId]);
  return rows;
}

async function updateScoreCategory(categoryId, score) {
  const query = `
    UPDATE scorecategory 
    SET score = ? 
    WHERE category_id = ?;
  `;
  const [result] = await pool.query(query, [score, categoryId]);
  return result.affectedRows > 0;
}

async function initializePlayerCategories(playerId) {
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

  const query = `
    INSERT INTO scorecategory (name, max_score, player_id, score) 
    VALUES ?;
  `;
  
  const values = categories.map(([name, maxScore]) => [name, maxScore, playerId, 0]);
  const [result] = await pool.query(query, [values]);
  return result.affectedRows === categories.length;
}

async function getPlayerTotalScore(playerId) {
  const query = `
    SELECT SUM(score) as total 
    FROM scorecategory 
    WHERE player_id = ?;
  `;
  const [rows] = await pool.query(query, [playerId]);
  return rows[0].total || 0;
}

async function resetPlayerCategories(playerId) {
  const query = `
    UPDATE scorecategory 
    SET score = 0 
    WHERE player_id = ?;
  `;
  const [result] = await pool.query(query, [playerId]);
  return result.affectedRows > 0;
}

async function getPlayerCategory(playerId, categoryName) {
  const query = `
    SELECT * 
    FROM scorecategory 
    WHERE player_id = ? 
    AND name = ?;
  `;
  const [rows] = await pool.query(query, [playerId, categoryName]);
  return rows[0];
}

module.exports = {
  createScoreCategory,
  getScoreCategoryById,
  getPlayerCategories,
  updateScoreCategory,
  initializePlayerCategories,
  getPlayerTotalScore,
  resetPlayerCategories,
  getPlayerCategory
};