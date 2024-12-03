const { runSQL } = require('../db');

async function createScoreCategory(name, maxScore, playerId) {
  const query = `
    INSERT INTO scorecategory (name, max_score, player_id, score) 
    VALUES (?, ?, ?, 0);
  `;
  const result = await runSQL(query, [name, maxScore, playerId]);
  return result.insertId;
}

async function getScoreCategoryById(categoryId) {
  const query = `
    SELECT * FROM scorecategory 
    WHERE category_id = ?;
  `;
  const results = await runSQL(query, [categoryId]);
  return results[0];
}

async function getPlayerCategories(playerId) {
  const query = `
    SELECT * FROM scorecategory 
    WHERE player_id = ?;
  `;
  return await runSQL(query, [playerId]);
}

async function updateScoreCategory(categoryId, score) {
  const query = `
    UPDATE scorecategory 
    SET score = ? 
    WHERE category_id = ?;
  `;
  const result = await runSQL(query, [score, categoryId]);
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

  try {
    // Using multiple single inserts since runSQL doesn't support multiple value sets
    for (const [name, maxScore] of categories) {
      const query = `
        INSERT INTO scorecategory (name, max_score, player_id, score) 
        VALUES (?, ?, ?, 0);
      `;
      await runSQL(query, [name, maxScore, playerId]);
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize player categories:', error);
    return false;
  }
}

async function getPlayerTotalScore(playerId) {
  const query = `
    SELECT SUM(score) as total 
    FROM scorecategory 
    WHERE player_id = ?;
  `;
  const results = await runSQL(query, [playerId]);
  return results[0].total || 0;
}

async function resetPlayerCategories(playerId) {
  const query = `
    UPDATE scorecategory 
    SET score = 0 
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