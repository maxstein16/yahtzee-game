import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  try {
    const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
    const newGame = await API.createGame(gameStatus);
    setGameId(newGame.game_id);

    const currentCategories = await API.getPlayerCategories(currentPlayer.player_id);
    const hasStartedPlaying = currentCategories.some(category => category.score !== null);

    if (hasStartedPlaying) {
      await API.resetPlayerCategories(currentPlayer.player_id);
    } else if (currentCategories.length === 0) {
      await API.initializePlayerCategories(currentPlayer.player_id);
    }

    if (mode === 'multiplayer') {
      const gamePlayers = await API.getPlayersInGame(newGame.game_id);
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

    await API.startGame(newGame.game_id);
    return { success: true, message: `New ${mode} game created!` };
  } catch (error) {
    return { success: false, message: `Failed to create game: ${error.message}` };
  }
};