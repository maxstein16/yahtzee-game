import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { initializeGame } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { handleRollDice, toggleDiceSelection, resetTurnState } from '../../services/diceService';
import { submitScore, resetPlayerCategories } from '../../services/scoreTurnService';
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
    if (!scores[category]) {
      message.warning('Select a valid dice combination.');
      return;
    }

    const result = await submitScore(gameId, currentPlayer, category, scores[category]);
    
    if (result.success) {
      resetTurnState({
        setDiceValues,
        setSelectedDice,
        setRollCount,
        setScores
      });
      
      message.success(result.message);
      setPlayerCategories(await API.getPlayerCategories(currentPlayer.player_id));
      setPlayerTotal((await API.getPlayerTotalScore(currentPlayer.player_id)).totalScore);
      
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
    } else {
      message.error(result.message);
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
    setIsChatVisible
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;