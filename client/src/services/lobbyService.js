import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  try {
    // First check if player has an active game
    const activeGame = await API.getActiveGameForPlayer(currentPlayer.player_id);
    let gameId;

    if (activeGame && activeGame.game_id) {
      // If there's an active game, use it
      gameId = activeGame.game_id;
      setGameId(gameId);

      // Load existing categories and state
      const categories = await API.getPlayerCategories(currentPlayer.player_id);
      if (categories && categories.length > 0) {
        return {
          success: true,
          message: 'Resumed existing game',
          gameId: gameId,
          existingGame: true,
          mode: 'singleplayer'
        };
      }
    }

    // If no active game or no categories, create a new game
    // Clean up any existing player categories
    await API.resetPlayerCategories(currentPlayer.player_id);
    
    // Add small delay before creating new game
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create new game
    const response = await API.createGame('pending', 0, currentPlayer.player_id);
    console.log('Raw API Response:', response);

    gameId = response.game?.game_id;
    
    if (!gameId) {
      console.error('Game response structure:', JSON.stringify(response, null, 2));
      throw new Error('No game ID found in response');
    }

    setGameId(gameId);

    // Initialize fresh categories for the player
    await API.initializePlayerCategories(currentPlayer.player_id);

    // Start the game
    await API.startGame(gameId);
    
    return { 
      success: true, 
      message: 'New game created!',
      gameId: gameId,
      existingGame: false,
      mode: 'singleplayer'
    };
    
  } catch (error) {
    console.error('Full error details:', error);
    return { 
      success: false, 
      message: `Failed to initialize game: ${error.message}`,
      error: error
    };
  }
};