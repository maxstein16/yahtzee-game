import * as API from '../utils/api';
import { message } from 'antd';

export const submitScore = async (gameId, currentPlayer, categoryName, score, currentDice) => {
  const debugInfo = {
    gameId,
    playerId: currentPlayer?.player_id,
    categoryName,
    score,
    diceInput: currentDice
  };
  
  console.log('Submit Score Debug Info:', debugInfo);

  try {
    // Validate inputs with detailed error messages
    if (!gameId) {
      console.error('Missing gameId:', debugInfo);
      return { success: false, message: 'Game ID is required.' };
    }
    
    if (!currentPlayer?.player_id) {
      console.error('Missing player info:', debugInfo);
      return { success: false, message: 'Valid player information is required.' };
    }
    
    if (!categoryName) {
      console.error('Missing category:', debugInfo);
      return { success: false, message: 'Category name is required.' };
    }

    // Get and validate category
    let scoreCategory;
    try {
      scoreCategory = await API.getPlayerCategory(currentPlayer.player_id, categoryName);
      console.log('Retrieved category:', scoreCategory);
    } catch (categoryError) {
      console.error('Category retrieval error:', categoryError);
      return { success: false, message: 'Failed to retrieve category information.' };
    }

    if (!scoreCategory) {
      console.error('Invalid category result:', { categoryName, playerId: currentPlayer.player_id });
      return { success: false, message: 'Invalid category.' };
    }

    // Process dice with extensive validation
    let validCurrentDice;
    try {
      if (!currentDice || (!Array.isArray(currentDice) && typeof currentDice !== 'object')) {
        validCurrentDice = [1, 1, 1, 1, 1];
        console.log('Using default dice values:', validCurrentDice);
      } else {
        const diceArray = Array.isArray(currentDice) ? currentDice : Array.from(currentDice);
        validCurrentDice = diceArray.map(dice => {
          const num = parseInt(dice, 10);
          return isNaN(num) ? 1 : Math.min(6, Math.max(1, num));
        });
        console.log('Processed dice values:', validCurrentDice);
      }
    } catch (diceError) {
      console.error('Dice processing error:', diceError);
      validCurrentDice = [1, 1, 1, 1, 1];
      console.log('Falling back to default dice after error');
    }

    const keepIndices = validCurrentDice.map((_, i) => i);

    // Submit score with error handling
    let result;
    try {
      result = await API.submitGameScore(gameId, currentPlayer.player_id, categoryName, score);
      console.log('Score submission result:', result);
    } catch (submitError) {
      console.error('Score submission API error:', submitError);
      throw new Error(`Failed to submit score: ${submitError.message}`);
    }

    if (!result) {
      throw new Error('Score submission returned no result');
    }

    // Roll dice with error handling
    try {
      await API.rollDice(gameId, {
        playerId: currentPlayer.player_id,
        currentDice: validCurrentDice,
        keepIndices
      });
      console.log('Dice roll completed');
    } catch (rollError) {
      console.error('Dice roll error:', rollError);
      // Continue execution even if dice roll fails
    }

    // Update turn with error handling
    let turnResult;
    try {
      turnResult = await API.updateTurn(gameId, currentPlayer.player_id, {
        dice: validCurrentDice,
        turn_score: score,
        categoryId: scoreCategory.category_id,
        status: 'completed'
      });
      console.log('Turn update completed:', turnResult);
    } catch (turnError) {
      console.error('Turn update error:', turnError);
      throw new Error(`Failed to update turn: ${turnError.message}`);
    }

    return {
      success: true,
      message: `${categoryName} score saved!`,
      updatedCategory: result.category,
      turn: turnResult
    };
  } catch (error) {
    console.error('Score submission error:', {
      error,
      debugInfo,
      stack: error.stack
    });
    
    // Provide more specific error message based on where the error occurred
    let errorMessage = 'An unexpected error occurred while submitting the score.';
    if (error.message.includes('category')) {
      errorMessage = 'Failed to process category information.';
    } else if (error.message.includes('dice')) {
      errorMessage = 'Failed to process dice values.';
    } else if (error.message.includes('turn')) {
      errorMessage = 'Failed to update turn information.';
    }

    return { 
      success: false, 
      message: errorMessage,
      error: error.message,
      details: debugInfo
    };
  }
};

export const getAvailableCategories = async (playerId) => {
  try {
    const categories = await API.getPlayerCategories(playerId);
    return categories;
  } catch (error) {
    console.error('Failed to get player categories:', error);
    return [];
  }
};

export const getPlayerTotalScore = async (playerId) => {
  try {
    const response = await API.getPlayerTotalScore(playerId);
    return response.totalScore;
  } catch (error) {
    console.error('Failed to get total score:', error);
    return 0;
  }
};

  export function calculateScores(dice) {
    const counts = Array(6).fill(0);
    dice.forEach((value) => counts[value - 1]++);
  
    return {
      ones: counts[0] * 1,
      twos: counts[1] * 2,
      threes: counts[2] * 3,
      fours: counts[3] * 4,
      fives: counts[4] * 5,
      sixes: counts[5] * 6,
      threeOfAKind: counts.some(count => count >= 3) ? dice.reduce((sum, value) => sum + value, 0) : 0,
      fourOfAKind: counts.some(count => count >= 4) ? dice.reduce((sum, value) => sum + value, 0) : 0,
      fullHouse: counts.includes(3) && counts.includes(2) ? 25 : 0,
      smallStraight: isSmallStraight(dice) ? 30 : 0,
      largeStraight: isLargeStraight(dice) ? 40 : 0,
      yahtzee: counts.includes(5) ? 50 : 0,
      chance: dice.reduce((sum, value) => sum + value, 0),
    };
  }
  
  function isSmallStraight(dice) {
    const uniqueValues = [...new Set(dice)].sort();
    const straights = [
      [1, 2, 3, 4],
      [2, 3, 4, 5],
      [3, 4, 5, 6],
    ];
    return straights.some((straight) => straight.every((val) => uniqueValues.includes(val)));
  }
  
  function isLargeStraight(dice) {
    const uniqueValues = [...new Set(dice)].sort();
    return JSON.stringify(uniqueValues) === JSON.stringify([1, 2, 3, 4, 5]) ||
      JSON.stringify(uniqueValues) === JSON.stringify([2, 3, 4, 5, 6]);
  }

  export const resetPlayerCategories = async ({
    currentPlayer,
    gameType,
    setPlayerCategories,
    setPlayerTotal,
    setAiCategories,
    setAiTotal
  }) => {
    try {
      await resetHumanPlayerCategories(currentPlayer, setPlayerCategories, setPlayerTotal);
      
      if (gameType === 'singleplayer') {
        await resetAIPlayerCategories(setAiCategories, setAiTotal);
      }
    } catch (error) {
      message.error('Failed to manage categories: ' + error.message);
    }
  };
  
  const resetHumanPlayerCategories = async (currentPlayer, setPlayerCategories, setPlayerTotal) => {
    const currentCategories = await API.getPlayerCategories(currentPlayer.player_id);
    const hasStartedPlaying = currentCategories.some(category => category.score !== null);
  
    if (hasStartedPlaying) {
      await API.resetPlayerCategories(currentPlayer.player_id);
    } else if (currentCategories.length === 0) {
      await API.initializePlayerCategories(currentPlayer.player_id);
    }
  
    const categories = await API.getPlayerCategories(currentPlayer.player_id);
    setPlayerCategories(categories);
    setPlayerTotal(0);
  };
  
  const resetAIPlayerCategories = async (setAiCategories, setAiTotal) => {
    const currentAICategories = await API.getPlayerCategories('ai-opponent');
    const aiHasStartedPlaying = currentAICategories.some(category => category.score !== null);
  
    if (aiHasStartedPlaying) {
      await API.resetPlayerCategories('ai-opponent');
    } else if (currentAICategories.length === 0) {
      await API.initializePlayerCategories('ai-opponent');
    }
  
    const aiCategories = await API.getPlayerCategories('ai-opponent');
    setAiCategories(aiCategories);
    setAiTotal(0);
  };