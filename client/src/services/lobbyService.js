import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  try {
    const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
    
    // Log the parameters being sent to createGame
    console.log('Creating game with params:', {
      status: gameStatus,
      round: 0,
      playerId: currentPlayer.player_id
    });

    const newGame = await API.createGame(gameStatus, 0, currentPlayer.player_id);
    
    // Log the entire response from createGame
    console.log('Response from createGame:', newGame);

    // Check if we have a valid game object
    if (!newGame || typeof newGame !== 'object') {
      throw new Error('Invalid response from createGame');
    }

    // Check which property contains the game ID
    const gameId = newGame.game_id || newGame.id || newGame.gameId;
    
    if (!gameId) {
      console.error('Game response structure:', newGame);
      throw new Error('No game ID found in response');
    }

    // Use the found gameId
    setGameId(gameId);

    const currentCategories = await API.getPlayerCategories(currentPlayer.player_id);
    const hasStartedPlaying = currentCategories.some(category => category.score !== null);

    if (hasStartedPlaying) {
      await API.resetPlayerCategories(currentPlayer.player_id);
    } else if (currentCategories.length === 0) {
      await API.initializePlayerCategories(currentPlayer.player_id);
    }

    if (mode === 'multiplayer') {
      const gamePlayers = await API.getPlayersInGame(gameId);
      setPlayers(gamePlayers);
    } else {
      const aiCategories = await API.getPlayerCategories('ai-opponent');
      const aiHasStartedPlaying = aiCategories.some(category => category.score !== null);

      if (aiHasStartedPlaying) {
        await API.resetPlayerCategories('ai-opponent');
      } else if (aiCategories.length === 0) {
        await API.initializePlayerCategories('ai-opponent');
      }
    }

    // Start the game with the found gameId
    await API.startGame(gameId);
    return { 
      success: true, 
      message: `New ${mode} game created!`,
      gameId: gameId // Include the gameId in the response for additional verification
    };
  } catch (error) {
    console.error('Full error details:', error);
    return { 
      success: false, 
      message: `Failed to create game: ${error.message}`,
      error: error // Include the full error for debugging
    };
  }
};