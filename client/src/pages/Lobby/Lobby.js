// src/pages/Lobby/Lobby.js
import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  initializeGame, 
  rollDice, 
  submitScore, 
  calculateScores,
  getPlayerTotalScore,
  getAvailableCategories 
} from '../../services/lobbyService';
import { playAITurn } from '../../services/aiOpponentService';
import * as API from '../../utils/api';
import LobbyView from './Lobby.jsx';

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
    const fetchCurrentPlayer = async () => {
      try {
        const token = localStorage.getItem('token');
        const playerId = localStorage.getItem('playerId');
        
        if (!token || !playerId) {
          navigate('/login');
          return;
        }

        const playerData = await API.getPlayerById(playerId);
        setCurrentPlayer(playerData);

        const categories = await API.getPlayerCategories(playerId);
        setPlayerCategories(categories);

        const total = await API.getPlayerTotalScore(playerId);
        setPlayerTotal(total.totalScore);
      } catch (error) {
        message.error('Session expired. Please login again');
        localStorage.removeItem('token');
        localStorage.removeItem('playerId');
        navigate('/login');
      }
    };

    fetchCurrentPlayer();
  }, [navigate]);

  // Initialize game when player or mode changes
  useEffect(() => {
    if (currentPlayer) {
      initializeGameSession();
    }
  }, [mode, currentPlayer]);

  const initializeGameSession = async () => {
    const result = await initializeGame(currentPlayer, mode, setGameId, setPlayers);
    if (result.success) {
      message.success(result.message);
      
      if (mode === 'singleplayer') {
        await initializeAIPlayer();
      } else {
        resetAIState();
      }
    } else {
      message.error(result.message);
    }
  };

  const initializeAIPlayer = async () => {
    setAiPlayer({
      player_id: 'ai-opponent',
      name: 'AI Opponent'
    });
    const aiCategories = await API.getPlayerCategories('ai-opponent');
    setAiCategories(aiCategories);
    const aiTotal = await API.getPlayerTotalScore('ai-opponent');
    setAiTotal(aiTotal.totalScore);
  };

  const resetAIState = () => {
    setAiPlayer(null);
    setAiCategories([]);
    setAiTotal(0);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('playerId');
    navigate('/login');
  };

  const resetTurnState = () => {
    setDiceValues(INITIAL_DICE_VALUES);
    setSelectedDice([]);
    setRollCount(0);
    setScores({});
  };

  const handleNewGame = async (gameType) => {
    setMode(gameType);
    resetTurnState();
    setAiDiceValues(INITIAL_DICE_VALUES);
    setAiRollCount(0);
    setIsAITurn(false);
    
    if (currentPlayer) {
      await resetPlayerCategories(gameType);
    }
  };

  const resetPlayerCategories = async (gameType) => {
    await API.resetPlayerCategories(currentPlayer.player_id);
    const categories = await API.getPlayerCategories(currentPlayer.player_id);
    setPlayerCategories(categories);
    setPlayerTotal(0);

    if (gameType === 'singleplayer') {
      await API.resetPlayerCategories('ai-opponent');
      const aiCategories = await API.getPlayerCategories('ai-opponent');
      setAiCategories(aiCategories);
      setAiTotal(0);
    }
  };

  const handleRollDice = async () => {
    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    setIsRolling(true);
    try {
      const result = await rollDice(gameId, currentPlayer, diceValues, selectedDice);
      if (result.success) {
        setDiceValues(result.dice);
        setScores(calculateScores(result.dice));
        setRollCount(result.rollCount);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Failed to roll dice');
    } finally {
      setIsRolling(false);
    }
  };

  const handleScoreCategoryClick = async (category) => {
    if (!scores[category]) {
      message.warning('Select a valid dice combination.');
      return;
    }

    const result = await submitScore(gameId, currentPlayer, category, scores[category]);
    if (result.success) {
      await handlePlayerTurnComplete();
      
      if (mode === 'singleplayer' && aiPlayer) {
        await handleAITurn();
      }
    } else {
      message.error(result.message);
    }
  };

  const handlePlayerTurnComplete = async () => {
    resetTurnState();
    message.success('Score submitted successfully!');
    
    const categories = await API.getPlayerCategories(currentPlayer.player_id);
    setPlayerCategories(categories);
    const newTotal = await API.getPlayerTotalScore(currentPlayer.player_id);
    setPlayerTotal(newTotal.totalScore);
  };

  const handleAITurn = async () => {
    setIsAITurn(true);
    try {
      await simulateAIRolls();
      await executeAIMove();
    } catch (error) {
      message.error('AI turn failed: ' + error.message);
    } finally {
      resetAITurnState();
    }
  };

  const simulateAIRolls = async () => {
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const rollResult = await rollDice(gameId, aiPlayer, aiDiceValues, []);
      if (rollResult.success) {
        setAiDiceValues(rollResult.dice);
        setAiRollCount(i + 1);
      }
    }
  };

  const executeAIMove = async () => {
    const scores = calculateScores(aiDiceValues);
    const { category: bestCategory, score: bestScore } = await playAITurn(gameId, aiPlayer);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    const aiResult = await submitScore(gameId, aiPlayer, bestCategory, bestScore);
    
    if (aiResult.success) {
      const newAiCategories = await API.getPlayerCategories('ai-opponent');
      setAiCategories(newAiCategories);
      const newAiTotal = await API.getPlayerTotalScore('ai-opponent');
      setAiTotal(newAiTotal.totalScore);
      
      message.success(`AI played ${bestCategory} for ${bestScore} points!`);
    }
  };

  const resetAITurnState = () => {
    setIsAITurn(false);
    setAiDiceValues(INITIAL_DICE_VALUES);
    setAiRollCount(0);
  };

  const toggleDiceSelection = (index) => {
    if (isRolling || isAITurn) return;
    setSelectedDice(prev =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  // Props to pass to the view component
  const viewProps = {
    // Game props
    mode,
    currentPlayer,
    gameId,
    
    // Player props
    diceValues,
    selectedDice,
    isRolling,
    rollCount,
    playerTotal,
    playerCategories,
    
    // AI props
    aiDiceValues,
    aiRollCount,
    isAITurn,
    aiTotal,
    aiCategories,
    
    // UI props
    isChatVisible,
    
    // Action handlers
    handleNewGame,
    handleLogout,
    handleRollDice,
    toggleDiceSelection,
    handleScoreCategoryClick,
    setIsChatVisible,
    calculateScores
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;