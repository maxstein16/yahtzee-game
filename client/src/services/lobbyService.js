import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  try {
    const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
    
    console.log('Creating game with params:', {
      status: gameStatus,
      round: 0,
      playerId: currentPlayer.player_id
    });

    // Add more detailed logging of the API call
    console.log('Current player:', currentPlayer);
    
    const newGame = await API.createGame(gameStatus, 0, currentPlayer.player_id);
    console.log('Raw API Response:', newGame);
    console.log('Response type:', typeof newGame);
    console.log('Response keys:', newGame ? Object.keys(newGame) : 'null or undefined response');

    // Check if we have a valid game object
    if (!newGame || typeof newGame !== 'object') {
      throw new Error(`Invalid response from createGame: ${JSON.stringify(newGame)}`);
    }

    // Log all possible ID fields
    console.log('Possible ID fields:', {
      game_id: newGame.game_id,
      id: newGame.id,
      gameId: newGame.gameId,
      _id: newGame._id,
      allFields: JSON.stringify(newGame, null, 2)
    });

    // Try to find any field that might contain the ID
    const gameId = newGame.game_id || newGame.id || newGame.gameId || newGame._id;
    
    if (!gameId) {
      console.error('Game response structure:', JSON.stringify(newGame, null, 2));
      throw new Error('No game ID found in response');
    }

    setGameId(gameId);

    const currentCategories = await API.getPlayerCategories(currentPlayer.player_id);
    console.log('Current categories:', currentCategories);
    
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

    await API.startGame(gameId);
    return { 
      success: true, 
      message: `New ${mode} game created!`,
      gameId: gameId,
      fullResponse: newGame  // Include full response for debugging
    };
  } catch (error) {
    console.error('Full error object:', error);
    console.error('Error stack:', error.stack);
    return { 
      success: false, 
      message: `Failed to create game: ${error.message}`,
      error: error
    };
  }
};