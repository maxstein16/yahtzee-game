import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { initializeGame, initializeDefaultCategories } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { resetTurnState } from '../../services/gameStateService';
import { rollDice, toggleDiceSelection } from '../../services/diceService';
import { resetPlayerCategories, calculateScores } from '../../services/scoreTurnService';
import LobbyView from './Lobby.jsx';
import API from '../../utils/api';

const INITIAL_DICE_VALUES = [1, 1, 1, 1, 1];

function Lobby() {
  const navigate = useNavigate();
  
  // Basic game state
  const [gameId, setGameId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isNewGame, setIsNewGame] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [shouldResetScores, setShouldResetScores] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Scoring and bonus state
  const [hasYahtzee, setHasYahtzee] = useState(false);
  const [yahtzeeBonus, setYahtzeeBonus] = useState(0);
  const [upperSectionTotal, setUpperSectionTotal] = useState(0);
  const [upperSectionBonus, setUpperSectionBonus] = useState(0);

  // Game play state
  const [diceValues, setDiceValues] = useState(INITIAL_DICE_VALUES);
  const [selectedDice, setSelectedDice] = useState([]);
  const [playerCategories, setPlayerCategories] = useState([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [currentScores, setCurrentScores] = useState({});
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  // Opponent-specific state
  const [opponentState, setOpponentState] = useState({
    categories: [],
    dice: INITIAL_DICE_VALUES,
    score: 0,
    rollCount: 0,
    isOpponentTurn: false,
    lastCategory: null,
    turnScore: 0
  });

  const resetOpponentTurn = () => {
    setOpponentState(prev => ({
      ...prev,
      isOpponentTurn: false,
      rollCount: 0,
      dice: INITIAL_DICE_VALUES
    }));
  };

  // Helper Functions
  const checkForYahtzeeBonus = (dice) => {
    if (!hasYahtzee) return false;
    return dice.every(value => value === dice[0]);
  };

  const updatePlayerScores = (scores) => {
    setPlayerTotal(scores.total);
    setUpperSectionTotal(scores.upperTotal);
    setUpperSectionBonus(scores.upperBonus);
    setYahtzeeBonus(scores.yahtzeeBonus);
    setHasYahtzee(scores.hasYahtzee);
  };

  const calculateAllScores = (categories) => {
    const upperCategories = categories.filter(cat => cat.section === 'upper');
    const upperTotal = upperCategories.reduce((total, cat) => total + (cat.score || 0), 0);
    const upperBonus = upperTotal >= 63 ? 35 : 0;
    
    const yahtzeeCategory = categories.find(cat => cat.name === 'yahtzee');
    const hasYahtzee = yahtzeeCategory?.score === 50;
    
    const total = categories.reduce((sum, cat) => sum + (cat.score || 0), 0) + upperBonus;
    
    return {
      upperTotal,
      upperBonus,
      hasYahtzee,
      yahtzeeBonus: categories.filter(cat => cat.name === 'yahtzeeBonus')
        .reduce((sum, cat) => sum + (cat.score || 0), 0),
      total
    };
  };

  // Initialize player
  useEffect(() => {
    const initializePlayer = async () => {
      setIsLoading(true);
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);
          
          let categories = await API.getPlayerCategories(playerInfo.playerData.player_id);
          if (!categories || categories.length === 0) {
            categories = await initializeDefaultCategories(playerInfo.playerData.player_id);
          }
          
          setPlayerCategories(categories);
          const scores = calculateAllScores(categories);
          updatePlayerScores(scores);
        }
      } catch (error) {
        console.error('Error initializing player:', error);
        message.error('Failed to initialize player data');
      } finally {
        setIsLoading(false);
      }
    };

    initializePlayer();
  }, [navigate]);

  // Initialize game session
  useEffect(() => {
    const initializeGameSession = async () => {
      if (!currentPlayer || isInitializing || isLoading) return;

      setIsInitializing(true);
      try {
        const result = await initializeGame(currentPlayer, 'singleplayer', setGameId, () => {});
        
        if (result.success) {
          if (!result.existingGame) {
            message.success(result.message);
          }
          
          let categories = await API.getPlayerCategories(currentPlayer.player_id);
          if (!categories || categories.length === 0) {
            categories = await initializeDefaultCategories(currentPlayer.player_id);
          }
          
          setPlayerCategories(categories);

          // Initialize opponent categories
          let opponentCategories = await API.getPlayerCategories('9');
          if (!opponentCategories || opponentCategories.length === 0) {
            opponentCategories = await initializeDefaultCategories('9');
          }
          setOpponentState(prev => ({ ...prev, categories: opponentCategories }));
          
          setIsNewGame(false);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Error initializing game:', error);
        message.error('Failed to initialize game');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeGameSession();
  }, [currentPlayer, isLoading]);

  // Handle opponent turns
  useEffect(() => {
    // In the opponent turn useEffect
  const executeOpponentTurn = async () => {
    if (opponentState.isOpponentTurn && gameId) {
      try {
        // Show each roll with delay
        for (let i = 0; i < 3; i++) {
          const newDice = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
          setOpponentState(prev => ({
            ...prev,
            dice: newDice,
            rollCount: i + 1
          }));
          
          message.info(`Opponent Roll ${i + 1}: ${newDice.join(', ')}`, 1);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Calculate best move
        const availableCategories = opponentState.categories.filter(cat => !cat.is_submitted);
        const scores = calculateScores(opponentState.dice);
        
        let bestCategory = availableCategories[0];
        let bestScore = scores[bestCategory.name] || 0;
        
        availableCategories.forEach(category => {
          const score = scores[category.name] || 0;
          if (score > bestScore) {
            bestScore = score;
            bestCategory = category;
          }
        });

        // Ensure we have valid data before submission
        if (!bestCategory?.name || bestScore === undefined) {
          throw new Error('Invalid category or score data');
        }

        // Submit score with validated data
        try {
          await API.submitGameScore(
            gameId,
            '9', // opponent ID
            bestCategory.name,
            Number(bestScore)
          );

          // Update opponent state only after successful submission
          const updatedCategories = await API.getPlayerCategories('9');
          setOpponentState(prev => ({
            ...prev,
            categories: updatedCategories,
            lastCategory: bestCategory.name,
            turnScore: bestScore,
            score: prev.score + bestScore,
            isOpponentTurn: false,
            rollCount: 0,
            dice: INITIAL_DICE_VALUES
          }));

          message.success(
            `Opponent chose ${bestCategory.name} for ${bestScore} points!`, 
            2.5
          );
        } catch (submitError) {
          console.error('Error submitting opponent score:', submitError);
          message.error('Failed to submit opponent score');
          resetOpponentTurn();
        }
      } catch (error) {
        console.error('Error during opponent turn:', error);
        message.error('Opponent turn failed');
        resetOpponentTurn();
      }
    }
  };

    executeOpponentTurn();
  }, [opponentState.isOpponentTurn, gameId, calculateScores]);

  // Handle new game
  const handleNewGame = async () => {
    if (!currentPlayer?.player_id) {
      message.error('No player found');
      return;
    }

    try {
      setIsLoading(true);

      // End current game if exists
      if (gameId) {
        try {
          await API.endGame(gameId);
        } catch (endError) {
          console.log('Previous game already ended or not found:', endError);
        }
      }

      let newGame;
      try {
        newGame = await API.createGame('pending', 0, currentPlayer.player_id);
      } catch (createError) {
        console.log('Error creating game:', createError);
        setIsNewGame(true);
        setGameId(null);
        return;
      }

      if (!newGame?.game_id) {
        setIsNewGame(true);
        setGameId(null);
        return;
      }

      await API.startGame(newGame.game_id);
      setGameId(newGame.game_id);
      
      // Reset player state
      resetTurnState({
        setDiceValues: (values) => {
          setDiceValues(values);
          setCurrentScores(calculateScores(values));
        },
        setSelectedDice,
        setRollCount,
        setScores: setCurrentScores
      });

      await resetPlayerCategories({
        currentPlayer,
        setPlayerCategories,
        setPlayerTotal
      });
      
      setHasYahtzee(false);
      setYahtzeeBonus(0);
      setUpperSectionTotal(0);
      setUpperSectionBonus(0);

      // Reset opponent's categories first
      await API.resetPlayerCategories('9');
      
      // Then initialize new categories for opponent
      const opponentCategories = await initializeDefaultCategories('9');
      
      // Reset all opponent state
      setOpponentState({
        categories: opponentCategories,
        dice: INITIAL_DICE_VALUES,
        score: 0,
        rollCount: 0,
        isOpponentTurn: false,
        lastCategory: null,
        turnScore: 0
      });
      
      // Get fresh categories for player
      const categories = await API.getPlayerCategories(currentPlayer.player_id);
      setPlayerCategories(categories);
      
      setShouldResetScores(true);
      setTimeout(() => {
        message.success('New game started successfully!');
        setShouldResetScores(false);
      }, 100);
      
    } catch (error) {
      console.error('Error during game initialization:', error);
      setIsNewGame(true);
      setGameId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle score submission
  const handleScoreCategoryClick = async (categoryName) => {
    if (!gameId || !currentPlayer?.player_id) {
      message.error('Game or player information missing');
      return;
    }

    try {
      const calculatedScores = calculateScores(diceValues);
      const categoryScore = calculatedScores[categoryName];

      // Handle Yahtzee scoring
      if (categoryName === 'yahtzee' && categoryScore === 50) {
        setHasYahtzee(true);
      } else if (hasYahtzee && checkForYahtzeeBonus(diceValues)) {
        const newBonus = yahtzeeBonus + 100;
        setYahtzeeBonus(newBonus);
        await API.submitYahtzeeBonus(gameId, currentPlayer.player_id, newBonus);
        message.success('Yahtzee Bonus! +100 points');
      }

      // Submit score
      await API.createTurn(gameId, currentPlayer.player_id, diceValues, rollCount, categoryScore, false);
      await API.submitGameScore(gameId, currentPlayer.player_id, categoryName, categoryScore);

      // Update categories and scores
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      setPlayerCategories(updatedCategories);
      
      const scores = calculateAllScores(updatedCategories);
      setUpperSectionTotal(scores.upperTotal);
      setUpperSectionBonus(scores.upperBonus);
      setPlayerTotal(scores.total + yahtzeeBonus);

      // Reset turn state
      setDiceValues(INITIAL_DICE_VALUES);
      setRollCount(0);
      setSelectedDice([]);
      setCurrentScores({});
      
      // Start opponent turn
      setOpponentState(prev => ({
        ...prev,
        isOpponentTurn: true
      }));

    } catch (error) {
      console.error('Error submitting score:', error);
      message.error('Failed to submit score');
    }
  };

  // Handle dice rolling
  const handleDiceRoll = async () => {
    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    setIsRolling(true);
    try {
      const result = await rollDice(gameId, currentPlayer, diceValues, selectedDice);
      if (result.success) {
        setDiceValues(result.dice);
        const newScores = calculateScores(result.dice);
        setCurrentScores(newScores);
        setRollCount(prevCount => prevCount + 1);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('Roll dice error:', error);
      message.error('Failed to roll dice');
    } finally {
      setIsRolling(false);
    }
  };

  // Prepare view props
  const viewProps = {
    currentPlayer,
    gameId,
    diceValues,
    selectedDice,
    isRolling,
    rollCount,
    playerCategories,
    shouldResetScores,
    isLoading,
    hasYahtzee,
    yahtzeeBonus,
    upperSectionTotal,
    upperSectionBonus,
    opponentState,
    handleNewGame,
    handleLogout: () => handleLogout(navigate),
    handleRollDice: handleDiceRoll,
    toggleDiceSelection: (index) => toggleDiceSelection(
      index,
      isRolling,
      false,
      setSelectedDice
    ),
    handleScoreCategoryClick,
    calculateScores,
    onTurnComplete: handleScoreCategoryClick
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;