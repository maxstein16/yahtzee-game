import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { initializeGame } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { resetTurnState } from '../../services/gameStateService.js'
import { handleRollDice, toggleDiceSelection } from '../../services/diceService';
import { resetPlayerCategories, calculateScores } from '../../services/scoreTurnService';
import { initializeAIPlayer, handleAITurn } from '../../services/aiOpponentService';
import LobbyView from './Lobby.jsx';
import API from '../../utils/api.js';

const INITIAL_DICE_VALUES = [1, 1, 1, 1, 1];

function Lobby() {
  const navigate = useNavigate();
  
  // Game State
  const [mode, setMode] = useState('singleplayer');
  const [gameId, setGameId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [players, setPlayers] = useState([]);

  // Player State
  const [diceValues, setDiceValues] = useState(INITIAL_DICE_VALUES);
  const [selectedDice, setSelectedDice] = useState([]);
  const [playerCategories, setPlayerCategories] = useState([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [scores, setScores] = useState({});
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  // AI State
  const [aiPlayer, setAiPlayer] = useState(null);
  const [aiDiceValues, setAiDiceValues] = useState(INITIAL_DICE_VALUES);
  const [aiCategories, setAiCategories] = useState([]);
  const [aiTotal, setAiTotal] = useState(0);
  const [aiRollCount, setAiRollCount] = useState(0);
  const [isAITurn, setIsAITurn] = useState(false);

  // UI State
  const [isChatVisible, setIsChatVisible] = useState(false);

  // Initialize player data and session check
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

  // Initialize game when player or mode changes
  useEffect(() => {
    const initializeGameSession = async () => {
      if (!currentPlayer) return;

      const result = await initializeGame(currentPlayer, mode, setGameId, setPlayers);
      
      if (result.success) {
        message.success(result.message);
        if (mode === 'singleplayer') {
          const aiInfo = await initializeAIPlayer();
          setAiPlayer(aiInfo.player);
          setAiCategories(aiInfo.categories);
          setAiTotal(aiInfo.totalScore);
        } else {
          setAiPlayer(null);
          setAiCategories([]);
          setAiTotal(0);
        }
      } else {
        message.error(result.message);
      }
    };

    initializeGameSession();
  }, [mode, currentPlayer]);

  const handleNewGame = async (gameType) => {
    setMode(gameType);
    resetTurnState({
      setDiceValues,
      setSelectedDice,
      setRollCount,
      setScores
    });
    
    setAiDiceValues(INITIAL_DICE_VALUES);
    setAiRollCount(0);
    setIsAITurn(false);
    
    if (currentPlayer) {
      await resetPlayerCategories({
        currentPlayer,
        gameType,
        setPlayerCategories,
        setPlayerTotal,
        setAiCategories,
        setAiTotal
      });
    }
  };

  const handleScoreCategoryClick = async (category) => {
    try {
      // First get category info
      const categoryInfo = await API.getPlayerCategory(currentPlayer.player_id, category);
      if (!categoryInfo) {
        message.error('Invalid category selected');
        return;
      }
  
      // Step 1: Create the turn with initial state
      const turnCreated = await API.createTurn(
        gameId,
        currentPlayer.player_id,
        diceValues,
        rollCount,
        scores[category],
        false
      );
  
      if (!turnCreated) {
        throw new Error('Failed to create turn');
      }
  
      // Step 2: Submit the score to the category
      const scoreResult = await API.submitGameScore(
        gameId, 
        currentPlayer.player_id, 
        category, 
        scores[category]
      );
      
      if (!scoreResult) {
        throw new Error('Failed to submit score');
      }
  
      // Step 3: Complete the turn with final state
      const turnResult = await API.submitTurn(
        gameId,
        currentPlayer.player_id,
        categoryInfo.category_id,
        scores[category],
        diceValues,
        rollCount
      );
  
      if (!turnResult) {
        throw new Error('Failed to complete turn');
      }
  
      // Now that everything is saved, reset the game state
      resetTurnState({
        setDiceValues,
        setSelectedDice,
        setRollCount,
        setScores
      });
      
      // Update categories and total score
      setPlayerCategories(await API.getPlayerCategories(currentPlayer.player_id));
      setPlayerTotal((await API.getPlayerTotalScore(currentPlayer.player_id)).totalScore);
      
      message.success(`${category} score saved!`);
      
      // Handle AI turn if in singleplayer mode
      if (mode === 'singleplayer' && aiPlayer) {
        await handleAITurn({
          gameId,
          aiPlayer,
          setIsAITurn,
          setAiDiceValues,
          setAiRollCount,
          setAiCategories,
          setAiTotal
        });
      }
  
    } catch (error) {
      console.error('Error submitting score and turn:', error);
      message.error(error.message || 'Failed to submit score and turn');
    }
  };

  const handleDiceRoll = () => handleRollDice({
    rollCount,
    gameId,
    currentPlayer,
    diceValues,
    selectedDice,
    setIsRolling,
    setDiceValues,
    setScores,
    setRollCount
  });

  const handleDiceSelection = (index) => toggleDiceSelection(
    index,
    isRolling,
    isAITurn,
    setSelectedDice
  );

  const handlePlayerLogout = () => handleLogout(navigate);

  // Props to pass to the view component
  const viewProps = {
    mode,
    currentPlayer,
    gameId,
    diceValues,
    selectedDice,
    isRolling,
    rollCount,
    playerTotal,
    playerCategories,
    aiDiceValues,
    aiRollCount,
    isAITurn,
    aiTotal,
    aiCategories,
    isChatVisible,
    handleNewGame,
    handleLogout: handlePlayerLogout,
    handleRollDice: handleDiceRoll,
    toggleDiceSelection: handleDiceSelection,
    handleScoreCategoryClick,
    setIsChatVisible,
    calculateScores
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;