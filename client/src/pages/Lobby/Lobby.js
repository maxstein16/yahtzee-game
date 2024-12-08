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
  
  const [gameId, setGameId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isNewGame, setIsNewGame] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [shouldResetScores, setShouldResetScores] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Game States
  const [diceValues, setDiceValues] = useState(INITIAL_DICE_VALUES);
  const [selectedDice, setSelectedDice] = useState([]);
  const [playerCategories, setPlayerCategories] = useState([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [currentScores, setCurrentScores] = useState({});
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  // Initialize default categories for new users
  const initializeDefaultCategories = async (playerId) => {
    try {
      const defaultCategories = [
        'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
        'threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight',
        'largeStraight', 'yahtzee', 'chance'
      ];

      const categories = await Promise.all(
        defaultCategories.map(async (category) => {
          try {
            return await API.createPlayerCategory(playerId, category);
          } catch (error) {
            console.error(`Error creating category ${category}:`, error);
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
          
          // Check if player has categories
          let categories = await API.getPlayerCategories(playerInfo.playerData.player_id);
          
          // If no categories exist, initialize them
          if (!categories || categories.length === 0) {
            categories = await initializeDefaultCategories(playerInfo.playerData.player_id);
          }
          
          setPlayerCategories(categories);
          
          const totalScore = await API.getPlayerTotalScore(playerInfo.playerData.player_id);
          setPlayerTotal(totalScore?.totalScore || 0);
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

  // Enhanced game initialization
  useEffect(() => {
    const initializeGameSession = async () => {
      if (!currentPlayer || isInitializing || isLoading) return;

      if (isNewGame || !gameId) {
        setIsInitializing(true);
        try {
          const result = await initializeGame(currentPlayer, 'singleplayer', setGameId, () => {});
          
          if (result.success) {
            message.success(result.message);
            
            // Ensure categories exist
            let categories = await API.getPlayerCategories(currentPlayer.player_id);
            if (!categories || categories.length === 0) {
              categories = await initializeDefaultCategories(currentPlayer.player_id);
            }
            setPlayerCategories(categories);
            
            const total = await API.getPlayerTotalScore(currentPlayer.player_id);
            setPlayerTotal(total?.totalScore || 0);
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
      }
    };

    initializeGameSession();
  }, [currentPlayer, isNewGame, gameId, isLoading, isInitializing]);

  const handleNewGame = async () => {
    try {
      if (gameId) {
        await API.endGame(gameId);
      }
      
      setIsNewGame(true);
      setGameId(null);
      setShouldResetScores(true);
      
      resetTurnState({
        setDiceValues: (values) => {
          setDiceValues(values);
          setCurrentScores(calculateScores(values));
        },
        setSelectedDice,
        setRollCount,
        setScores: setCurrentScores
      });
      
      if (currentPlayer) {
        await resetPlayerCategories({
          currentPlayer,
          setPlayerCategories,
          setPlayerTotal
        });
      }

      setTimeout(() => {
        setShouldResetScores(false);
      }, 100);
    } catch (error) {
      console.error('Error starting new game:', error);
      message.error('Failed to start new game');
    }
  };

  const handleScoreCategoryClick = async (categoryName) => {
    if (!gameId || !currentPlayer?.player_id) {
      message.error('Game or player information missing');
      return;
    }
  
    try {
      // Find the category ID
      const category = playerCategories.find(cat => cat.name === categoryName);
      if (!category) {
        throw new Error('Category not found');
      }
  
      // Calculate the score for this category
      const calculatedScores = calculateScores(diceValues);
      const score = calculatedScores[categoryName];
  
      // Submit the game score
      await API.submitGameScore(
        gameId,
        currentPlayer.player_id,
        categoryName,
        score
      );
  
      // Submit the turn with the correct score
      await API.submitTurn(
        gameId,
        currentPlayer.player_id,
        category.category_id,
        score,
        diceValues,
        rollCount
      );
  
      // Reset dice and roll count
      setDiceValues(INITIAL_DICE_VALUES);
      setRollCount(0);
      setSelectedDice([]);
  
    } catch (error) {
      console.error('Error submitting score and turn:', error);
      message.error('Failed to submit score');
      throw error;
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

  const handleDiceSelection = (index) => toggleDiceSelection(
    index,
    isRolling,
    false,
    setSelectedDice
  );

  const handlePlayerLogout = () => handleLogout(navigate);

  const handleTurnComplete = () => {
    // Reset dice values to initial state
    setDiceValues(INITIAL_DICE_VALUES);
    // Clear selected dice
    setSelectedDice([]);
    // Reset roll count
    setRollCount(0);
    // Clear current scores
    setCurrentScores({});
  };

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
    handleNewGame,
    handleLogout: handlePlayerLogout,
    handleRollDice: handleDiceRoll,
    toggleDiceSelection: handleDiceSelection,
    handleScoreCategoryClick,
    calculateScores,
    onTurnComplete: handleTurnComplete
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;