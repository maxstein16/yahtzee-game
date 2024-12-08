import * as API from '../utils/api';

export const initializeGame = async (currentPlayer, mode, setGameId, setPlayers) => {
  try {
    // Check for active game
    const activeGame = await API.getActiveGameForPlayer(currentPlayer.player_id);
    let gameId;

    if (activeGame && activeGame.game_id) {
      gameId = activeGame.game_id;
      setGameId(gameId);

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

    // Create new game if no active game exists
    await API.resetPlayerCategories(currentPlayer.player_id);
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await API.createGame('pending', 0, currentPlayer.player_id);
    gameId = response.game?.game_id;

    if (!gameId) {
      throw new Error('No game ID found in response');
    }

    setGameId(gameId);
    await API.initializePlayerCategories(currentPlayer.player_id);
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

export const initializeDefaultCategories = async (playerId) => {
  const defaultCategories = [
    { name: 'ones', section: 'upper', maxScore: 5 },
    { name: 'twos', section: 'upper', maxScore: 10 },
    { name: 'threes', section: 'upper', maxScore: 15 },
    { name: 'fours', section: 'upper', maxScore: 20 },
    { name: 'fives', section: 'upper', maxScore: 25 },
    { name: 'sixes', section: 'upper', maxScore: 30 },
    { name: 'threeOfAKind', section: 'lower', maxScore: 30 },
    { name: 'fourOfAKind', section: 'lower', maxScore: 30 },
    { name: 'fullHouse', section: 'lower', maxScore: 25 },
    { name: 'smallStraight', section: 'lower', maxScore: 30 },
    { name: 'largeStraight', section: 'lower', maxScore: 40 },
    { name: 'yahtzee', section: 'lower', maxScore: 50 },
    { name: 'chance', section: 'lower', maxScore: 30 },
  ];

  try {
    const categories = await Promise.all(
      defaultCategories.map(async (category) => {
        try {
          const newCategory = await API.initializePlayerCategories(
            playerId,
            category.name,
            category.section,
            category.maxScore
          );
          return { ...newCategory, section: category.section, maxScore: category.maxScore };
        } catch (error) {
          console.error(`Error creating category ${category.name}:`, error);
          return null;
        }
      })
    );

    return categories.filter((cat) => cat !== null);
  } catch (error) {
    console.error('Error initializing default categories:', error);
    throw new Error('Failed to initialize game categories');
  }
};

export const executeOpponentTurn = async (gameId, opponentId, categories, dice, API) => {
  try {
    // Calculate best scoring category
    const scores = calculateOpponentScores(dice);
    const availableCategories = categories.filter(cat => !cat.is_submitted);
    
    let bestCategory = availableCategories[0];
    let bestScore = scores[bestCategory.name] || 0;
    
    availableCategories.forEach(category => {
      const score = scores[category.name] || 0;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    });

    // Submit the score
    await API.submitGameScore(gameId, opponentId, bestCategory.name, bestScore);

    return {
      finalDice: dice,
      score: bestScore,
      selectedCategory: bestCategory
    };
  } catch (error) {
    console.error('Error executing opponent turn:', error);
    throw error;
  }
};