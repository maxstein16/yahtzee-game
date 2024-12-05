const API_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app/api';

// Helper function to handle API requests
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'An error occurred');
  }
  return response.json();
};

// Authentication
export const login = async (credentials) => apiRequest('/players/login', 'POST', credentials);

export const register = async (userData) => apiRequest('/players/register', 'POST', userData);

// Game Management
export const createGame = (status = 'pending', round = 0) =>
  apiRequest('/game', 'POST', { status, round });

export const getGameById = (gameId) => apiRequest(`/game/${gameId}`);

export const updateGame = (gameId, status, round) =>
  apiRequest(`/game/${gameId}`, 'PUT', { status, round });

export const deleteGame = (gameId) => apiRequest(`/game/${gameId}`, 'DELETE');

export const startGame = (gameId) =>
  apiRequest(`/game/${gameId}/start`, 'PUT');

// Score Category Management
export const initializePlayerCategories = async (playerId) => {
  try {
    const response = await apiRequest(`/scorecategory/init/${playerId}`, 'POST');
    return response.categories;
  } catch (error) {
    console.error('Error initializing categories:', error);
    throw error;
  }
};

export const getPlayerCategories = (playerId) => 
  apiRequest(`/scorecategory/player/${playerId}`);

export const getPlayerCategory = (playerId, categoryName) => 
  apiRequest(`/scorecategory/player/${playerId}/category/${categoryName}`);

export const updateScoreCategory = (categoryId, score) => 
  apiRequest(`/scorecategory/${categoryId}`, 'PUT', { score });

export const getPlayerTotalScore = (playerId) => 
  apiRequest(`/scorecategory/player/${playerId}/total`);

export const resetPlayerCategories = (playerId) => 
  apiRequest(`/scorecategory/player/${playerId}/reset`, 'PUT');

export const submitGameScore = (gameId, playerId, categoryName, score) => 
  apiRequest(`/scorecategory/game/${gameId}/submit`, 'PUT', {
    playerId,
    categoryName,
    score
  });

// Chat Management
export const getChatMessages = (gameId) => apiRequest(`/game/${gameId}/chat`);

export const sendMessage = (gameId, playerId, message) =>
  apiRequest(`/game/${gameId}/chat`, 'POST', { player_id: playerId, message });

// Turn Management
export const rollDice = (gameId, currentDice, keepIndices) =>
  apiRequest(`/game/${gameId}/roll`, 'POST', { currentDice, keepIndices });

export const submitTurn = (gameId, playerId, categoryId, score, dice) =>
  apiRequest(`/game/${gameId}/turn`, 'PUT', {
    playerId,
    categoryId,
    score,
    dice
  });

export const getLatestTurn = (gameId, playerId) => 
  apiRequest(`/game/${gameId}/turn?player_id=${playerId}`);

export const updateTurn = (gameId, playerId, turnData) =>
  apiRequest(`/game/${gameId}/roll`, 'PUT', {
    playerId,
    dice: turnData.dice,
    turn_score: turnData.turn_score,
    status: turnData.status,
    categoryId: turnData.categoryId
  });
  
// Players in Game
export const getPlayersInGame = (gameId) => apiRequest(`/game/${gameId}/players`);

export const getPlayerById = (playerId) => apiRequest(`/players/${playerId}`);

const API = {
  login,
  register,
  createGame,
  getGameById,
  updateGame,
  deleteGame,
  startGame,
  initializePlayerCategories,
  getPlayerCategories,
  getPlayerCategory,
  updateScoreCategory,
  getPlayerTotalScore,
  resetPlayerCategories,
  submitGameScore,
  getChatMessages,
  sendMessage,
  rollDice,
  submitTurn,
  getPlayersInGame,
  getPlayerById,
  getLatestTurn,
  updateTurn
};

export default API;