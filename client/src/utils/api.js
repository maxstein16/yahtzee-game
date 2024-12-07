const API_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app/api';

// Helper function to handle API requests
const apiRequest = async (endpoint, method = 'GET', body = null, retries = 3) => {
  const options = {
    method,
    headers: { 
      'Content-Type': 'application/json',
      // Add custom headers if needed
    },
    credentials: 'include',
    mode: 'cors' // Explicitly set CORS mode
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let attempt = 0;

  while (attempt < retries) {
    try {
      const response = await fetch(url, options);
      
      // Handle different response status codes
      if (response.status === 503) {
        console.warn(`Service unavailable, attempt ${attempt + 1} of ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        attempt++;
        continue;
      }
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.warn(`Network error, attempt ${attempt + 1} of ${retries}`);
        if (attempt === retries - 1) {
          throw new Error('Network error: Failed to connect to the server after multiple attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        attempt++;
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Failed to complete request after multiple attempts');
};

// Authentication
export const login = async (credentials) => apiRequest('/players/login', 'POST', credentials);

export const register = async (userData) => apiRequest('/players/register', 'POST', userData);

// Game Management
export const createGame = (status, round, playerId) => {
  if (!playerId) {
    throw new Error('Player ID is required to create a game');
  }
  
  return apiRequest('/game', 'POST', {
    status: status || 'pending',
    round: Number(round) || 0,
    playerId: playerId
  });
};

export const getGameById = (gameId) => apiRequest(`/game/${gameId}`);

export const updateGame = (gameId, status, round) =>
  apiRequest(`/game/${gameId}`, 'PUT', { status, round });

export const deleteGame = (gameId) => apiRequest(`/game/${gameId}`, 'DELETE');

export const startGame = (gameId) =>
  apiRequest(`/game/${gameId}/start`, 'PUT');

export const endGame = (gameId) =>
  apiRequest(`/game/${gameId}/end`, 'PUT');

export const getActiveGameForPlayer = (playerId) => 
  apiRequest(`/game/active/${playerId}`);

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
  apiRequest(`/scorecategory/${categoryId}`, 'PUT', { 
    score, 
    is_submitted: true 
  });

export const resetPlayerCategories = (playerId) => {
  if (!playerId) {
    throw new Error('Player ID is required to reset categories');
  }
  return apiRequest(`/scorecategory/player/${playerId}/reset`, 'PUT');
};

export const submitGameScore = (gameId, playerId, categoryName, score) => {
  const payload = {
    playerId,
    categoryName,
    score,
    is_submitted: true
  };
  
  console.log('API submitGameScore payload:', payload);
  
  // Validate the data before sending
  if (!playerId || !categoryName || score === undefined) {
    console.error('Invalid data in submitGameScore:', payload);
    throw new Error('Missing required fields');
  }

  return apiRequest(`/scorecategory/game/${gameId}/submit`, 'PUT', payload);
};

export const getPlayerTotalScore = (playerId) => 
  apiRequest(`/scorecategory/player/${playerId}/total`);

// Chat Management
export const getChatMessages = (gameId) => apiRequest(`/game/${gameId}/chat`);

export const sendMessage = (gameId, playerId, message) =>
  apiRequest(`/game/${gameId}/chat`, 'POST', { player_id: playerId, message });

// Turn Management
export const rollDice = (gameId, {playerId, currentDice, keepIndices}) =>
  apiRequest(`/game/${gameId}/roll`, 'POST', { 
    playerId, 
    currentDice, 
    keepIndices 
  });

  export const submitTurn = (gameId, playerId, categoryId, score, dice, rerolls) => {
    if (!gameId || !playerId || !categoryId || score === undefined) {
      throw new Error('Missing required parameters for turn submission');
    }
    
    // Ensure score is a number, not an array
    const turnScore = typeof score === 'number' ? score : 0;
    
    // Convert dice array to string if needed
    const diceString = Array.isArray(dice) ? JSON.stringify(dice) : dice;
    
    return apiRequest(`/game/${gameId}/turn`, 'PUT', {
      playerId: Number(playerId),
      categoryId: Number(categoryId),
      score: turnScore,
      dice: diceString,
      rerolls: Number(rerolls) || 0
    });
  };  

  export const createTurn = async (gameId, playerId, dice, rerolls = 0, turnScore = 0, turnCompleted = false) => {
    if (!gameId || !playerId) {
      throw new Error('Game ID and Player ID are required');
    }
  
    const payload = {
      playerId,
      dice: Array.isArray(dice) ? dice : [1, 1, 1, 1, 1],
      rerolls: Number(rerolls) || 0,
      turnScore: Number(turnScore) || 0,
      turnCompleted: Boolean(turnCompleted)
    };
  
    try {
      const result = await apiRequest(`/game/${gameId}/turn`, 'POST', payload);
      console.log('Turn created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating turn:', error);
      if (error.message.includes('CORS')) {
        throw new Error('Server connection error. Please try again later.');
      }
      throw error;
    }
  };

export const updateTurn = (gameId, playerId, dice, rerolls, turnScore, turnCompleted) =>
  apiRequest(`/game/${gameId}/roll`, 'PUT', {
    playerId,
    dice: dice || [1, 1, 1, 1, 1],
    rerolls: rerolls || 0,
    turnScore: turnScore || 0,
    turnCompleted: turnCompleted || false
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
  endGame,
  startGame,
  getActiveGameForPlayer,
  getPlayerCategories,
  getPlayerCategory,
  updateScoreCategory,
  resetPlayerCategories,
  initializePlayerCategories,
  getPlayerTotalScore,
  submitGameScore,
  getChatMessages,
  sendMessage,
  rollDice,
  submitTurn,
  createTurn,
  getPlayersInGame,
  getPlayerById,
  updateTurn
};

export default API;