const express = require('express');
const router = express.Router();
const { submitTurn } = require('../db/turnQueries');
const broadcastMessage = require('../utils/broadcast');
const { playTurn } = require('../utils/diceUtils');

let rollCount = 0; 

router.post('/game/:id/roll', async (req, res) => {
    try {
      const { keepIndices = [] } = req.body;
      rollCount += 1;
  
      if (rollCount > 3) {
        rollCount = 0; // Reset for the next turn
        return res.status(400).json({ error: 'Maximum of 3 rolls allowed per turn' });
      }
  
      const currentDice = req.body.currentDice || [];
      const result = playTurn(rollCount, currentDice, keepIndices);
  
      if (rollCount === 3) rollCount = 0; // Reset after the last roll
  
      res.json({ dice: result.dice, rollCount });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

router.put('/game/:id/turn', async (req, res) => {
  try {
    const { player_id, category_id, score } = req.body;
    const game_id = req.params.id;

    const turnResult = await submitTurn(game_id, player_id, category_id, score);
    broadcastMessage(turnResult);

    res.json(turnResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
