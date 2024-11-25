const pool = require('../db');

// Create a new score category
async function createScoreCategory(name, maxScore, playerId) {
  const query = `
    INSERT INTO scorecategory (name, max_score, player_id, score) 
    VALUES ($1, $2, $3, 0) 
    RETURNING *;
  `;
  const values = [name, maxScore, playerId];
  const res = await pool.query(query, values);
  return res.rows[0];
}

// Get a score category by ID
async function getScoreCategoryById(categoryId) {
  const query = `
    SELECT * FROM scorecategory 
    WHERE category_id = $1;
  `;
  const res = await pool.query(query, [categoryId]);
  return res.rows[0];
}

// Update a score category
async function updateScoreCategory(categoryId, score) {
  const query = `
    UPDATE scorecategory 
    SET score = $1 
    WHERE category_id = $2 
    RETURNING *;
  `;
  const values = [score, categoryId];
  const res = await pool.query(query, values);
  return res.rows[0];
}

// Delete a score category
async function deleteScoreCategory(categoryId) {
  const query = `
    DELETE FROM scorecategory 
    WHERE category_id = $1;
  `;
  await pool.query(query, [categoryId]);
}

module.exports = {
  createScoreCategory,
  getScoreCategoryById,
  updateScoreCategory,
  deleteScoreCategory
};
