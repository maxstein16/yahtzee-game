const express = require('express');
const router = express.Router();
const { playTurn } = require('../utils/diceUtils');
const { createTurn, getLatestTurn, updateTurn, submitTurn} = require('../db/turnQueries');

let rollCount = 0; 

router.post('/game/:id/roll', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { playerId, currentDice, keepIndices } = req.body;

    // Validate current player is allowed to roll
    const latestTurn = await getLatestTurn(gameId, playerId);
    if (!latestTurn || latestTurn.turn_completed) {
      return res.status(400).json({ error: 'It is not your turn to roll.' });
    }

    const result = playTurn(latestTurn.rerolls + 1, currentDice, keepIndices);

    if (result.rollCount > 3) {
      return res.status(400).json({ error: 'Maximum of 3 rolls per turn exceeded.' });
    }

    await updateTurn(gameId, playerId, result.dice, result.rollCount, latestTurn.turn_score, false);

    res.json({ dice: result.dice, rollCount: result.rollCount });
  } catch (error) {
    console.error('Error in roll dice:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.put('/game/:id/turn', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { playerId, score, dice, rerolls } = req.body;

    // Ensure this player is completing their active turn
    const latestTurn = await getLatestTurn(gameId, playerId);
    if (!latestTurn || latestTurn.turn_completed) {
      return res.status(400).json({ error: 'It is not your turn to complete.' });
    }

    await updateTurn(gameId, playerId, dice, rerolls, score, true);

    // Create the next turn for the other player
    const nextPlayerId = await getNextPlayerTurn(gameId);
    const nextTurn = await createTurn(gameId, nextPlayerId, [1, 1, 1, 1, 1]);

    res.json({ completedTurn: latestTurn, nextTurn });
  } catch (error) {
    console.error('Error completing turn:', error.message);
    res.status(500).json({ error: error.message });
  }
});

  router.get('/game/:id/turn', async (req, res) => {
    try {
      const gameId = req.params.id;
      const playerId = req.query.player_id;
  
      console.log('GET /game/:id/turn called with:', { gameId, playerId });
  
      if (!gameId || !playerId) {
        console.error('Missing required parameters');
        return res.status(400).json({ error: 'Missing required parameters' });
      }
  
      const turn = await getLatestTurn(gameId, playerId);
  
      if (!turn) {
        console.error('No active turn found for game:', gameId, 'player:', playerId);
        return res.status(404).json({ error: 'No active turn found' });
      }
  
      console.log('Returning turn:', turn);
      res.json(turn);
    } catch (error) {
      console.error('Error fetching turn:', error.message);
      console.error('Stack trace:', error.stack); // Add stack trace for more context
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });   
  
router.post('/game/:id/turn', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { playerId, dice, rerolls = 0, turnScore = 0, turnCompleted = false } = req.body;

    if (!gameId || !playerId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const initialDice = dice || [1, 1, 1, 1, 1];
    const turn = await createTurn(
      gameId, 
      playerId, 
      initialDice,
      rerolls,
      turnScore,
      turnCompleted
    );
    
    res.json(turn);
  } catch (error) {
    console.error('Create turn error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modified to handle turn completion
router.put('/game/:id/turn', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { playerId, score, dice, rerolls } = req.body;

    if (!gameId || !playerId || score === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // First update the turn with final values
    await updateTurn(gameId, playerId, dice, rerolls, score, true);

    // Then submit the score with all parameters
    const turn = await submitTurn(gameId, playerId, score, dice, rerolls);
    res.json(turn);
  } catch (error) {
    console.error('Submit turn error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;