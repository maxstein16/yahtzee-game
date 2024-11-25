import axios from 'axios';

/**
 * Roll the dice via the backend API.
 * @param {string} gameId - ID of the current game.
 * @param {number[]} currentDice - Current dice results.
 * @param {number[]} keepIndices - Indices of dice to keep on reroll.
 * @returns {Promise<Object>} The new dice values and roll count.
 */
export async function rollDice(gameId, currentDice = [], keepIndices = []) {
  try {
    const response = await axios.post(`api/game/${gameId}/roll`, {
      currentDice,
      keepIndices,
    });
    return response.data;
  } catch (error) {
    console.error('Error rolling dice:', error);
    throw error;
  }
}

/**
 * Submit the current turn's score.
 * @param {string} gameId - ID of the current game.
 * @param {Object} turnData - Data for the turn (player_id, category_id, score).
 * @returns {Promise<Object>} The result of the turn submission.
 */
export async function submitTurn(gameId, turnData) {
  try {
    const response = await axios.put(`api/game/${gameId}/turn`, turnData);
    return response.data;
  } catch (error) {
    console.error('Error submitting turn:', error);
    throw error;
  }
}
