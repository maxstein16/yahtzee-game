import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { initializeGame } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { resetTurnState } from '../../services/gameStateService.js';
import { handleRollDice, toggleDiceSelection } from '../../services/diceService';
import { resetPlayerCategories } from '../../services/scoreTurnService';
import { initializeAIPlayer } from '../../services/aiOpponentService';
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

  // Fetch current player on component mount
  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);
          setPlayerCategories(playerInfo.categories);
          setPlayerTotal(playerInfo.total);
        }
      } catch (error) {
        console.error('Failed to fetch player data:', error.message);
      }
    };
    fetchPlayerData();
  }, [navigate]);

  // Reconnect to an active game if available
  useEffect(() => {
    const reconnectToActiveGame = async () => {
      if (!currentPlayer) return;

      try {
        const game = await API.getGameByPlayerId(currentPlayer.player_id);
        setGameId(game.game_id);
        message.success('Reconnected to your active game!');
      } catch (error) {
        console.log('No active game found:', error.message);
      }
    };
    reconnectToActiveGame();
  }, [currentPlayer]);

  // Initialize a new game session when mode or player changes
  useEffect(() => {
    const initializeGameSession = async () => {
      if (!currentPlayer) return;

      try {
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
      } catch (error) {
        console.error('Error initializing game session:', error.message);
      }
    };
    initializeGameSession();
  }, [mode, currentPlayer]);

  // Handle starting a new game
  const handleNewGame = async (gameType) => {
    setMode(gameType);
    resetTurnState({ setDiceValues, setSelectedDice, setRollCount, setScores });
    setAiDiceValues(INITIAL_DICE_VALUES);
    setAiRollCount(0);
    setIsAITurn(false);

    if (currentPlayer) {
      try {
        await resetPlayerCategories(currentPlayer.player_id);
        message.success('Player categories reset for new game.');
      } catch (error) {
        console.error('Error resetting player categories:', error.message);
      }
    }
  };

  // Handle dice roll
  const handleDiceRoll = () =>
    handleRollDice({
      rollCount,
      gameId,
      currentPlayer,
      diceValues,
      selectedDice,
      setIsRolling,
      setDiceValues,
      setScores,
      setRollCount,
    });

  // Handle dice selection
  const handleDiceSelection = (index) =>
    toggleDiceSelection(index, isRolling, isAITurn, setSelectedDice);

  // Handle logout
  const handlePlayerLogout = () => handleLogout(navigate);

  // Props to pass to LobbyView
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
    setIsChatVisible,
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;
