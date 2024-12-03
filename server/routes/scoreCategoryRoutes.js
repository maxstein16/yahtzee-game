const express = require('express');
const router = express.Router();
const { 
  initializePlayerCategories,
  getPlayerCategories,
  updateScoreCategory,
  getPlayerTotalScore,
  resetPlayerCategories,
  getPlayerCategory
} = require('../db/scoreCategoryQueries');

// POST route to initialize categories for a player
router.post('/scorecategory/init/:playerId', async (req, res) => {
  try {
    await initializePlayerCategories(req.params.playerId);
    res.json({ message: 'Score categories initialized successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET route to get all categories for a player
router.get('/scorecategory/player/:playerId', async (req, res) => {
  try {
    const categories = await getPlayerCategories(req.params.playerId);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET route to get a specific category for a player
router.get('/scorecategory/player/:playerId/category/:categoryName', async (req, res) => {
  try {
    const category = await getPlayerCategory(
      req.params.playerId,
      req.params.categoryName
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT route to update a score category
router.put('/scorecategory/:categoryId', async (req, res) => {
  try {
    const { score } = req.body;
    if (score === undefined) {
      return res.status(400).json({ message: 'Score is required' });
    }
    const updated = await updateScoreCategory(req.params.categoryId, score);
    if (!updated) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Score updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET route to get total score for a player
router.get('/scorecategory/player/:playerId/total', async (req, res) => {
  try {
    const totalScore = await getPlayerTotalScore(req.params.playerId);
    res.json({ totalScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT route to reset all categories for a player (new game)
router.put('/scorecategory/player/:playerId/reset', async (req, res) => {
  try {
    const reset = await resetPlayerCategories(req.params.playerId);
    if (!reset) {
      return res.status(404).json({ message: 'Player categories not found' });
    }
    res.json({ message: 'Categories reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE route to delete all categories for a player (cleanup)
router.delete('/scorecategory/player/:playerId', async (req, res) => {
  try {
    await deletePlayerCategories(req.params.playerId);
    res.json({ message: 'Player categories deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET route to get all categories for a game
router.get('/scorecategory/game/:gameId', async (req, res) => {
  try {
    const categories = await getGameCategories(req.params.gameId);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT route to submit a score for a category in a game
router.put('/scorecategory/game/:gameId/submit', async (req, res) => {
  try {
    const { playerId, categoryName, score } = req.body;
    if (!playerId || !categoryName || score === undefined) {
      return res.status(400).json({ message: 'PlayerId, categoryName, and score are required' });
    }
    
    const category = await getPlayerCategory(playerId, categoryName);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const updated = await updateScoreCategory(category.category_id, score);
    if (!updated) {
      throw new Error('Failed to update score');
    }
    
    res.json({ 
      message: 'Score submitted successfully',
      category: {
        ...category,
        score
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;