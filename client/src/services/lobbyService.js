import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  try {
    // Step 1: Create a new game
    const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
    const newGame = await API.createGame(gameStatus);

    // Set the game ID in the state
    setGameId(newGame.game_id);

    // Step 2: Check and reset or initialize the player's categories
    const currentCategories = await API.getPlayerCategories(currentPlayer.player_id);
    const hasStartedPlaying = currentCategories.some(category => category.score !== null);

    if (hasStartedPlaying) {
      // Reset player categories if they have started playing
      await API.resetPlayerCategories(currentPlayer.player_id);
    } else if (currentCategories.length === 0) {
      // Initialize player categories if none exist
      await API.initializePlayerCategories(currentPlayer.player_id);
    }

    // Step 3: Add the current player to the game
    await API.addPlayerToGame(newGame.game_id, currentPlayer.player_id);

    // Step 4: Handle multiplayer or singleplayer-specific setup
    if (mode === 'multiplayer') {
      const gamePlayers = await API.getPlayersInGame(newGame.game_id);
      setPlayers(gamePlayers); // Set the players in the game
    } else if (mode === 'singleplayer') {
      // AI Opponent setup
      const aiPlayerId = 'ai-opponent';
      const aiCategories = await API.getPlayerCategories(aiPlayerId);
      const aiHasStartedPlaying = aiCategories.some(category => category.score !== null);

      if (aiHasStartedPlaying) {
        // Reset AI categories if they have started playing
        await API.resetPlayerCategories(aiPlayerId);
      } else if (aiCategories.length === 0) {
        // Initialize AI categories if none exist
        await API.initializePlayerCategories(aiPlayerId);
      }

      // Optionally add AI to the game (if required for backend tracking)
      await API.addPlayerToGame(newGame.game_id, aiPlayerId);
    }

    // Step 5: Start the game
    await API.startGame(newGame.game_id);

    // Return success message
    return { success: true, message: `New ${mode} game created!` };
  } catch (error) {
    console.error('Error initializing game:', error);
    return { success: false, message: `Failed to create game: ${error.message}` };
  }
};