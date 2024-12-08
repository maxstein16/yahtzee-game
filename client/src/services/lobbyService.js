import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  try {
    // First check if player has an active game
    const activeGame = await API.getActiveGameForPlayer(currentPlayer.player_id);
    let gameId;

    if (activeGame) {
      // If there's an active game, end it first
      try {
        await API.endGame(activeGame.game_id);
        // Add a small delay to ensure the game ending is processed
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (endError) {
        console.log('Error ending previous game:', endError);
      }
    }

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
      message: `Failed to create game: ${error.message}`,
      error: error
    };
  }
};