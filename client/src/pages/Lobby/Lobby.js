import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { initializeGame, initializeDefaultCategories } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { resetTurnState } from '../../services/gameStateService';
import { rollDice, toggleDiceSelection } from '../../services/diceService';
import { resetPlayerCategories, calculateScores } from '../../services/scoreTurnService';
import LobbyView from './LobbyView';
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
          handleGameInitialization(result);
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

          const finalResult = await calculateOpponentMove();
          updateOpponentState(finalResult);
          await submitOpponentScore(finalResult);

          message.success(
            `Opponent chose ${finalResult.selectedCategory.name} for ${finalResult.score} points!`, 
            2.5
          );
        } catch (error) {
          console.error('Error during opponent turn:', error);
          message.error('Opponent turn failed');
          resetOpponentTurn();
        }
      }
    };

    executeOpponentTurn();
  }, [opponentState.isOpponentTurn, gameId]);

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

  const handleNewGame = async () => {
    if (!currentPlayer?.player_id) {
      message.error('No player found');
      return;
    }

    try {
      setIsLoading(true);

      // Clean up existing game if exists
      if (gameId) {
        try {
          await API.endGame(gameId);
        } catch (endError) {
          console.log('Previous game already ended or not found:', endError);
        }
      }

      // Create new game
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
      
      // Reset turn state
      resetTurnState({
        setDiceValues: (values) => {
          setDiceValues(values);
          setCurrentScores(calculateScores(values));
        },
        setSelectedDice,
        setRollCount,
        setScores: setCurrentScores
      });

      // Reset player categories using the imported function
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
      
      // Reset opponent state
      setOpponentState({
        categories: [],
        dice: INITIAL_DICE_VALUES,
        score: 0,
        rollCount: 0,
        isOpponentTurn: false,
        lastCategory: null,
        turnScore: 0
      });
      
      // Get fresh categories
      const categories = await API.getPlayerCategories(currentPlayer.player_id);
      setPlayerCategories(categories);
      
      setShouldResetScores(true);
      
      // Reset shouldResetScores after a short delay
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

  const handleScoreCategoryClick = async (categoryName) => {
    if (!validateScoreSubmission(categoryName)) return;

    try {
      const categoryScore = await calculateAndSubmitScore(categoryName);
      await updateGameState(categoryName, categoryScore);
      resetTurnState();
    } catch (error) {
      console.error('Error submitting score and turn:', error);
      message.error('Failed to submit score');
    }
  };

  const handleDiceRoll = async () => {
    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    setIsRolling(true);
    try {
      const result = await rollDice(gameId, currentPlayer, diceValues, selectedDice);
      if (result.success) {
        updateDiceState(result);
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

  const handleTurnComplete = () => {
    resetTurnState({
      setDiceValues,
      setSelectedDice,
      setRollCount,
      setCurrentScores
    });
    
    setOpponentState(prev => ({
      ...prev,
      isOpponentTurn: true
    }));
  };

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
    handleRollDice,
    toggleDiceSelection: (index) => toggleDiceSelection(
      index,
      isRolling,
      false,
      setSelectedDice
    ),
    handleScoreCategoryClick,
    calculateScores,
    onTurnComplete: handleTurnComplete
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;