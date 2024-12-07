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

  // Game States
  const [diceValues, setDiceValues] = useState(INITIAL_DICE_VALUES);
  const [selectedDice, setSelectedDice] = useState([]);
  const [playerCategories, setPlayerCategories] = useState([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [currentScores, setCurrentScores] = useState({});
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (diceValues && diceValues.length > 0 && rollCount > 0) {
      const newScores = calculateScores(diceValues);
      console.log('New calculated scores:', newScores);
      setCurrentScores(newScores);
    }
  }, [diceValues, rollCount]);

  useEffect(() => {
    const initializePlayer = async () => {
      const playerInfo = await fetchCurrentPlayer(navigate);
      if (playerInfo) {
        setCurrentPlayer(playerInfo.playerData);
        setPlayerCategories(playerInfo.categories);
        setPlayerTotal(playerInfo.total);
      }
    };

    initializePlayer();
  }, [navigate]);

  useEffect(() => {
    const initializeGameSession = async () => {
      if (!currentPlayer || isInitializing) return;

      if (isNewGame || !gameId) {
        setIsInitializing(true);
        try {
          const result = await initializeGame(currentPlayer, 'singleplayer', setGameId, () => {});
          
          if (result.success) {
            message.success(result.message);
            
            if (result.existingGame) {
              const categories = await API.getPlayerCategories(currentPlayer.player_id);
              setPlayerCategories(categories);
              const total = await API.getPlayerTotalScore(currentPlayer.player_id);
              setPlayerTotal(total.totalScore);
            }
            
            setIsNewGame(false);
          } else {
            message.error(result.message);
          }
        } finally {
          setIsInitializing(false);
        }
      }
    };

    initializeGameSession();
  }, [currentPlayer, isNewGame, gameId]);

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

  const handleScoreCategoryClick = async (category) => {
    try {
      const categoryInfo = await API.getPlayerCategory(currentPlayer.player_id, category);
      if (!categoryInfo) {
        message.error('Invalid category selected');
        return;
      }
  
      const turnCreated = await API.createTurn(
        gameId,
        currentPlayer.player_id,
        diceValues,
        rollCount,
        currentScores[category.toLowerCase()],
        false
      );
  
      if (!turnCreated) {
        throw new Error('Failed to create turn');
      }
  
      // Add console.log to see what we're sending
      console.log('Submitting score with:', {
        gameId,
        playerId: currentPlayer.player_id,
        categoryName: category,  // Make sure this matches exactly
        score: currentScores[category.toLowerCase()]
      });
  
      const scoreResult = await API.submitGameScore(
        gameId, 
        currentPlayer.player_id, 
        category,  // This needs to exactly match what the API expects
        currentScores[category.toLowerCase()]
      );
      
      if (!scoreResult) {
        throw new Error('Failed to submit score');
      }
  
      const turnResult = await API.submitTurn(
        gameId,
        currentPlayer.player_id,
        categoryInfo.category_id,
        currentScores[category.toLowerCase()],
        diceValues,
        rollCount
      );
  
      if (!turnResult) {
        throw new Error('Failed to complete turn');
      }
  
      resetTurnState({
        setDiceValues: (values) => {
          setDiceValues(values);
          setCurrentScores(calculateScores(values));
        },
        setSelectedDice,
        setRollCount,
        setScores: setCurrentScores
      });
      
      setPlayerCategories(await API.getPlayerCategories(currentPlayer.player_id));
      setPlayerTotal((await API.getPlayerTotalScore(currentPlayer.player_id)).totalScore);
      
      message.success(`${category} score saved!`);
  
    } catch (error) {
      console.error('Error submitting score and turn:', error);
      message.error(error.message || 'Failed to submit score and turn');
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