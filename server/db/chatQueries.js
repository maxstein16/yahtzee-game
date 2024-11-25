// server/db/chatQueries.js

/**
 * Adds a chat message to the database (placeholder).
 * @param {number} gameId - ID of the game.
 * @param {number} playerId - ID of the player.
 * @param {string} message - The message content.
 * @returns {Object} - Placeholder chat message data.
 */
async function addChatMessage(gameId, playerId, message) {
    // Mock implementation for testing
    return { gameId, playerId, message, sent_at: new Date() };
}

/**
 * Retrieves chat messages for a game (placeholder).
 * @param {number} gameId - ID of the game.
 * @returns {Array} - Placeholder array of chat messages.
 */
async function getChatMessages(gameId) {
    // Mock implementation for testing
    return [{ gameId, playerId: 1, message: "Test message", sent_at: new Date() }];
}

module.exports = { addChatMessage, getChatMessages };
  