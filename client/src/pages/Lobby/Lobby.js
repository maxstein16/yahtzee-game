import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { initializeGame } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { resetTurnState } from '../../services/gameStateService.js'
import { handleRollDice, toggleDiceSelection } from '../../services/diceService';
import { resetPlayerCategories, calculateScores } from '../../services/scoreTurnService';
import LobbyView from './Lobby.jsx';
import API from '../../utils/api.js';

const INITIAL_DICE_VALUES = [1, 1, 1, 1, 1];

function Lobby() {
  const navigate = useNavigate();
  
  const [gameId, setGameId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isNewGame, setIsNewGame] = useState(false);
  const [mode, setMode] = useState('singleplayer');
  const [isInitializing, setIsInitializing] = useState(false);

  const [diceValues, setDiceValues] = useState(INITIAL_DICE_VALUES);
  const [selectedDice, setSelectedDice] = useState([]);
  const [playerCategories, setPlayerCategories] = useState([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [scores, setScores] = useState({});
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

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
          const result = await initializeGame(currentPlayer, mode, setGameId, () => {});
          
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
  }, [currentPlayer, isNewGame, gameId, mode]);

  const handleNewGame = async (selectedMode = 'singleplayer') => {
    try {
      if (gameId) {
        await API.endGame(gameId);
      }
      
      setMode(selectedMode);
      setIsNewGame(true);
      setGameId(null);
      
      resetTurnState({
        setDiceValues,
        setSelectedDice,
        setRollCount,
        setScores
      });
      
      if (currentPlayer) {
        await resetPlayerCategories({
          currentPlayer,
          setPlayerCategories,
          setPlayerTotal
        });
      }
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
        scores[category],
        false
      );
  
      if (!turnCreated) {
        throw new Error('Failed to create turn');
      }
  
      const scoreResult = await API.submitGameScore(
        gameId, 
        currentPlayer.player_id, 
        category, 
        scores[category]
      );
      
      if (!scoreResult) {
        throw new Error('Failed to submit score');
      }
  
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
  
      resetTurnState({
        setDiceValues,
        setSelectedDice,
        setRollCount,
        setScores
      });
      
      setPlayerCategories(await API.getPlayerCategories(currentPlayer.player_id));
      setPlayerTotal((await API.getPlayerTotalScore(currentPlayer.player_id)).totalScore);
      
      message.success(`${category} score saved!`);
  
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
    false,
    setSelectedDice
  );

  const handlePlayerLogout = () => handleLogout(navigate);

  const viewProps = {
    currentPlayer,
    gameId,
    mode,
    diceValues,
    selectedDice,
    isRolling,
    rollCount,
    playerTotal,
    playerCategories,
    handleNewGame,
    handleLogout: handlePlayerLogout,
    handleRollDice: handleDiceRoll,
    toggleDiceSelection: handleDiceSelection,
    handleScoreCategoryClick,
    calculateScores
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;