import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  try {
    const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
    
    const response = await API.createGame(gameStatus, 0, currentPlayer.player_id);
    console.log('Raw API Response:', response);

    // Access the nested game_id
    const gameId = response.game?.game_id;
    
    if (!gameId) {
      console.error('Game response structure:', JSON.stringify(response, null, 2));
      throw new Error('No game ID found in response');
    }

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

    await API.startGame(gameId);
    return { 
      success: true, 
      message: `New ${mode} game created!`,
      gameId: gameId
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