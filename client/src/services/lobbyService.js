import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  try {
    // Validate required parameters
    if (!currentPlayer?.player_id) {
      throw new Error('Invalid player information');
    }

    // Step 1: Create the game
    const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
    console.log('Creating game with:', { 
      status: gameStatus, 
      round: 0, 
      playerId: currentPlayer.player_id 
    });
    
    const newGame = await API.createGame(gameStatus, 0, currentPlayer.player_id);
    
    if (!newGame?.game_id) {
      throw new Error('Game creation failed - no game ID received');
    }
    
    console.log('New game created:', newGame);
    
    // Step 2: Update state with new game ID immediately
    setGameId(newGame.game_id);

    // Step 3: Initialize or reset player categories
    const initializePlayerSetup = async (playerId) => {
      const categories = await API.getPlayerCategories(playerId);
      const hasStartedPlaying = categories.some(category => category.score !== null);

      if (hasStartedPlaying) {
        await API.resetPlayerCategories(playerId);
      } else if (categories.length === 0) {
        await API.initializePlayerCategories(playerId);
      }
      return categories;
    };

    // Initialize human player
    await initializePlayerSetup(currentPlayer.player_id);

    // Step 4: Handle mode-specific setup
    if (mode === 'multiplayer') {
      const gamePlayers = await API.getPlayersInGame(newGame.game_id);
      setPlayers(gamePlayers);
    } else {
      // Initialize AI player for singleplayer mode
      await initializePlayerSetup('ai-opponent');
    }

    // Step 5: Start the game only after all setup is complete
    console.log('Starting game with ID:', newGame.game_id);
    await API.startGame(newGame.game_id);

    return { 
      success: true, 
      message: `New ${mode} game created!`,
      gameId: newGame.game_id 
    };
  } catch (error) {
    console.error('Game initialization error:', error);
    return { 
      success: false, 
      message: `Failed to create game: ${error.message}`,
      error 
    };
  }
};