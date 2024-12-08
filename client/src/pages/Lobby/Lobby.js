import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { initializeGame } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { resetTurnState } from '../../services/gameStateService.js'
import { rollDice, toggleDiceSelection } from '../../services/diceService';
import { resetPlayerCategories, calculateScores } from '../../services/scoreTurnService';
import LobbyView from './Lobby.jsx';
import API from '../../utils/api.js';

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
  const [opponentCategories, setOpponentCategories] = useState([]);
  const [opponentDice, setOpponentDice] = useState([1, 1, 1, 1, 1]);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentRollCount, setOpponentRollCount] = useState(0);
  const [isOpponentTurn, setIsOpponentTurn] = useState(false);


  // Initialize default categories
  const initializeDefaultCategories = async (playerId) => {
    try {
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
        { name: 'chance', section: 'lower', maxScore: 30 }
      ];

      const categories = await Promise.all(
        defaultCategories.map(async (category) => {
          try {
            const newCategory = await API.createPlayerCategory(
              playerId,
              category.name,
              category.section,
              category.maxScore
            );
            return {
              ...newCategory,
              section: category.section,
              maxScore: category.maxScore
            };
          } catch (error) {
            console.error(`Error creating category ${category.name}:`, error);
            return null;
          }
        })
      );

      const validCategories = categories.filter(cat => cat !== null);
      setPlayerCategories(validCategories);
      return validCategories;
    } catch (error) {
      console.error('Error initializing default categories:', error);
      message.error('Failed to initialize game categories');
      return [];
    }
  };

  // Enhanced player initialization
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
          
          // Calculate initial scores and bonuses
          const scores = calculateAllScores(categories);
          setPlayerTotal(scores.total);
          setUpperSectionTotal(scores.upperTotal);
          setUpperSectionBonus(scores.upperBonus);
          setYahtzeeBonus(scores.yahtzeeBonus);
          setHasYahtzee(scores.hasYahtzee);
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

  useEffect(() => {
    const initializeOpponent = async () => {
      if (gameId) {
        try {
          // Check if opponent categories already exist
          let categories = await API.getPlayerCategories('9'); // Replace '9' with opponent ID
  
          if (!categories || categories.length === 0) {
            // Create default categories for the opponent if none exist
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
  
            categories = await Promise.all(
              defaultCategories.map(async (category) => {
                try {
                  const newCategory = await API.createPlayerCategory(
                    '9', // Replace with opponent ID
                    category.name,
                    category.section,
                    category.maxScore
                  );
                  return { ...newCategory, section: category.section, maxScore: category.maxScore };
                } catch (error) {
                  console.error(`Error creating opponent category ${category.name}:`, error);
                  return null;
                }
              })
            );
  
            categories = categories.filter((cat) => cat !== null); // Remove any failed categories
          }
  
          setOpponentCategories(categories);
          setOpponentDice([1, 1, 1, 1, 1]);
          setOpponentScore(0);
          setOpponentRollCount(0);
        } catch (error) {
          console.error('Error initializing opponent:', error);
        }
      }
    };
  
    initializeOpponent();
  }, [gameId, API]);
   

  // Score calculation utilities
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
      yahtzeeBonus: categories.filter(cat => cat.name === 'yahtzeeBonus').reduce((sum, cat) => sum + (cat.score || 0), 0),
      total
    };
  };

  const checkForYahtzeeBonus = (dice) => {
    if (!hasYahtzee) return false;
    return dice.every(value => value === dice[0]);
  };

  const onTurnComplete = () => {
    console.log("Player turn completed!");
  };  

  // Modified game initialization effect in Lobby.jsx
  useEffect(() => {
    const initializeGameSession = async () => {
      if (!currentPlayer || isInitializing || isLoading) return;

      setIsInitializing(true);
      try {
        // Initialize or resume game
        const result = await initializeGame(currentPlayer, 'singleplayer', setGameId, () => {});
        
        if (result.success) {
          // Only show message for new games
          if (!result.existingGame) {
            message.success(result.message);
          }
          
          // Load categories and game state
          let categories = await API.getPlayerCategories(currentPlayer.player_id);
          if (!categories || categories.length === 0) {
            categories = await initializeDefaultCategories(currentPlayer.player_id);
          }
          
          setPlayerCategories(categories);
          
          if (result.existingGame) {
            try {
              // Get the current game details
              const gameDetails = await API.getGameById(result.gameId);
              
              if (gameDetails) {
                // Get the latest turn if it exists
                const lastTurn = gameDetails.currentTurn || {};
                
                // Restore dice state
                if (lastTurn.dice) {
                  const diceArray = typeof lastTurn.dice === 'string' 
                    ? JSON.parse(lastTurn.dice) 
                    : lastTurn.dice;
                  setDiceValues(diceArray);
                  
                  // Calculate potential scores based on current dice
                  if (lastTurn.rerolls > 0) {
                    setCurrentScores(calculateScores(diceArray));
                  }
                } else {
                  setDiceValues(INITIAL_DICE_VALUES);
                }

                // Restore roll count
                setRollCount(lastTurn.rerolls || 0);

                // Check for Yahtzee
                const yahtzeeCategory = categories.find(cat => cat.name === 'yahtzee');
                const hasExistingYahtzee = yahtzeeCategory?.is_submitted && yahtzeeCategory?.score === 50;
                setHasYahtzee(hasExistingYahtzee);

                // Calculate total scores
                let upperTotal = 0;
                let yahtzeeBonus = 0;

                categories.forEach(category => {
                  if (category.is_submitted) {
                    if (['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].includes(category.name)) {
                      upperTotal += category.score;
                    }
                    if (category.name === 'yahtzeeBonus') {
                      yahtzeeBonus += category.score;
                    }
                  }
                });

                setYahtzeeBonus(yahtzeeBonus);
                setUpperSectionTotal(upperTotal);
                setUpperSectionBonus(upperTotal >= 63 ? 35 : 0);

                // Calculate and set total score
                const totalScore = categories.reduce((sum, cat) => {
                  return sum + (cat.is_submitted ? cat.score : 0);
                }, 0);
                setPlayerTotal(totalScore + (upperTotal >= 63 ? 35 : 0) + yahtzeeBonus);
              }
            } catch (error) {
              console.error('Error loading game state:', error);
              // If we can't load the game state, reset to initial values
              setDiceValues(INITIAL_DICE_VALUES);
              setSelectedDice([]);
              setRollCount(0);
              setCurrentScores({});
            }
          } else {
            // Reset all states for new game
            setDiceValues(INITIAL_DICE_VALUES);
            setSelectedDice([]);
            setRollCount(0);
            setCurrentScores({});
            setHasYahtzee(false);
            setYahtzeeBonus(0);
            setUpperSectionTotal(0);
            setUpperSectionBonus(0);
            setPlayerTotal(0);
          }
          
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

  // Handle new game
  const handleNewGame = async () => {
    if (!currentPlayer?.player_id) {
      message.error('No player found');
      return;
    }
  
    try {
      setIsLoading(true);
  
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
      
      // Reset all game state
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
      
      // Reset bonus states
      setHasYahtzee(false);
      setYahtzeeBonus(0);
      setUpperSectionTotal(0);
      setUpperSectionBonus(0);
      
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
      const category = playerCategories.find(cat => cat.name === categoryName);
      if (!category) {
        throw new Error('Category not found');
      }

      const calculatedScores = calculateScores(diceValues);
      let categoryScore = calculatedScores[categoryName];

      // Handle Yahtzee scoring
      if (categoryName === 'yahtzee' && categoryScore === 50) {
        setHasYahtzee(true);
      } else if (hasYahtzee && checkForYahtzeeBonus(diceValues)) {
        const newBonus = yahtzeeBonus + 100;
        setYahtzeeBonus(newBonus);
        await API.submitYahtzeeBonus(gameId, currentPlayer.player_id, newBonus);
        message.success('Yahtzee Bonus! +100 points');
      }

      // Submit turn and score
      await API.createTurn(gameId, currentPlayer.player_id, diceValues, rollCount, categoryScore, false);
      await API.submitGameScore(gameId, currentPlayer.player_id, categoryName, categoryScore);
      await API.submitTurn(gameId, currentPlayer.player_id, category.category_id, categoryScore, diceValues, rollCount);

      // Update categories and recalculate scores
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

    } catch (error) {
      console.error('Error submitting score and turn:', error);
      message.error('Failed to submit score');
      throw error;
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
        console.log('Calculated scores after roll:', newScores);
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

  // Handle dice selection
  const handleDiceSelection = (index) => toggleDiceSelection(
    index,
    isRolling,
    false,
    setSelectedDice
  );

  const handlePlayerLogout = () => handleLogout(navigate);

  const handleTurnComplete = () => {
    setDiceValues(INITIAL_DICE_VALUES);
    setSelectedDice([]);
    setRollCount(0);
    setCurrentScores({});
    onTurnComplete();
    setIsOpponentTurn(true);
  };

  // Prepare view props
  const viewProps = {
    currentPlayer,
    gameId,
    scores: currentScores,
    diceValues,
    selectedDice,
    isRolling,
    rollCount,
    playerTotal,
    playerCategories,
    shouldResetScores,
    isLoading,
    hasYahtzee,
    yahtzeeBonus,
    upperSectionTotal,
    upperSectionBonus,
    opponentCategories,       // Added opponent state
    opponentDice,            // Added opponent state
    opponentScore,           // Added opponent state
    opponentRollCount,       // Added opponent state
    isOpponentTurn,          // Added opponent state
    isNewGame,
    handleNewGame,
    handleLogout: handlePlayerLogout,
    handleRollDice: handleDiceRoll,
    toggleDiceSelection: handleDiceSelection,
    handleScoreCategoryClick,
    calculateScores,
    onTurnComplete: handleTurnComplete,
    setOpponentCategories,   // Added setters
    setOpponentDice,         // Added setters
    setOpponentScore,        // Added setters
    setOpponentRollCount,    // Added setters
    setIsOpponentTurn        // Added setter
  };  

  return <LobbyView {...viewProps} />;
}

export default Lobby;