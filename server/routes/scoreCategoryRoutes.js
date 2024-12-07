const express = require('express');
const router = express.Router();
const { 
  initializePlayerCategories,
  getPlayerCategories,
  updateScoreCategory,
  resetPlayerCategories,
  getPlayerCategory,
  getPlayerTotalScore
} = require('../db/scoreCategoryQueries');

// POST route to initialize categories for a player
router.post('/scorecategory/init/:playerId', async (req, res) => {
  try {
    const existingCategories = await getPlayerCategories(req.params.playerId);
    if (existingCategories && existingCategories.length > 0) {
      return res.json({ 
        message: 'Score categories already exist',
        categories: existingCategories 
      });
    }

    await initializePlayerCategories(req.params.playerId);
    const newCategories = await getPlayerCategories(req.params.playerId);
    res.json({ 
      message: 'Score categories initialized successfully',
      categories: newCategories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET route to get all categories for a player
router.get('/scorecategory/player/:playerId', async (req, res) => {
  try {
    const categories = await getPlayerCategories(req.params.playerId);
    // Ensure we send the is_submitted field
    const formattedCategories = categories.map(category => ({
      ...category,
      is_submitted: Boolean(category.is_submitted)
    }));
    res.json(formattedCategories);
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
    // Ensure we send the is_submitted field
    category.is_submitted = Boolean(category.is_submitted);
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
    
    // Return the updated category with is_submitted field
    res.json({ 
      message: 'Score submitted successfully',
      category: {
        ...category,
        score,
        is_submitted: true
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/scorecategory/player/:playerId/total', async (req, res) => {
  try {
    const totalScore = await getPlayerTotalScore(req.params.playerId);
    res.json({ totalScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;