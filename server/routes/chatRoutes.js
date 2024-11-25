const express = require('express');
const router = express.Router();
const { addChatMessage, getChatMessages } = require('../db/chatQueries');
const broadcastMessage = require('../utils/broadcast');

router.post('/game/:id/chat', async (req, res) => {
  try {
    const { player_id, message } = req.body;
    const chatMessage = await addChatMessage(req.params.id, player_id, message);
    broadcastMessage({ type: 'NEW_CHAT_MESSAGE', chatMessage });
    res.json(chatMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/game/:id/chat', async (req, res) => {
  try {
    const messages = await getChatMessages(req.params.id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
