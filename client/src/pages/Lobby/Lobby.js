// src/components/Lobby/Lobby.js
import React, { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { initializeGame, initializeDefaultCategories } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { resetTurnState } from '../../services/gameStateService';
import { rollDice, toggleDiceSelection } from '../../services/diceService';
import { resetPlayerCategories, calculateScores } from '../../services/scoreTurnService';
import { calculateOptimalMove, getThresholdForCategory } from '../../services/opponentService';
import { chatService } from '../../services/websocketService';
import LobbyView from './Lobby.jsx';
import API from '../../utils/api';

const INITIAL_DICE_VALUES = [1, 1, 1, 1, 1];

function Lobby() {
  const navigate = useNavigate();

  // Game State
  const [gameId, setGameId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [gameMode, setGameMode] = useState('singleplayer');
  const [isLoading, setIsLoading] = useState(true);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [currentScores, setCurrentScores] = useState({});
  
  // Multiplayer State
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [opponent, setOpponent] = useState(null);

  // Player State
  const [diceValues, setDiceValues] = useState(INITIAL_DICE_VALUES);
  const [selectedDice, setSelectedDice] = useState([]);
  const [playerCategories, setPlayerCategories] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [shouldResetScores, setShouldResetScores] = useState(false);

  // Scoring State
  const [playerTotal, setPlayerTotal] = useState(0);
  const [hasYahtzee, setHasYahtzee] = useState(false);
  const [yahtzeeBonus, setYahtzeeBonus] = useState(0);
  const [upperSectionTotal, setUpperSectionTotal] = useState(0);
  const [upperSectionBonus, setUpperSectionBonus] = useState(0);

  // Opponent State
  const [opponentState, setOpponentState] = useState({
    categories: [],
    dice: INITIAL_DICE_VALUES,
    score: 0,
    rollCount: 0,
    isOpponentTurn: false,
    lastCategory: null,
    turnScore: 0
  });

  // Initialize player on mount
  useEffect(() => {
    const initializePlayer = async () => {
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

  // Add this effect to handle opponent turns in single player mode
useEffect(() => {
  const executeOpponentTurn = async () => {
    if (opponentState.isOpponentTurn && gameId && gameMode === 'singleplayer') {
      try {
        // Initial roll
        const opponentPlayer = { player_id: '9', name: 'Opponent' };
        const firstRoll = await rollDice(gameId, opponentPlayer, INITIAL_DICE_VALUES, []);

        if (!firstRoll.success) {
          throw new Error('Failed first roll');
        }

        let currentDice = firstRoll.dice;
        
        setOpponentState(prev => ({
          ...prev,
          dice: currentDice,
          rollCount: 1
        }));
        
        message.info(`Opponent Roll 1: ${currentDice.join(', ')}`, 1);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Calculate optimal move
        const availableCategories = opponentState.categories.filter(cat => !cat.is_submitted);
        if (!availableCategories.length) {
          throw new Error('No available categories');
        }

        let bestMove = calculateOptimalMove(currentDice, availableCategories, calculateScores);
        
        // Do 1-2 more rolls if beneficial
        for (let roll = 2; roll <= 3; roll++) {
          if (bestMove.expectedScore < getThresholdForCategory(bestMove.category.name)) {
            // Roll again, keeping optimal dice
            const rollResult = await rollDice(
              gameId,
              opponentPlayer,
              currentDice,
              bestMove.keepIndices
            );

            if (!rollResult.success) {
              throw new Error(`Failed roll ${roll}`);
            }

            currentDice = rollResult.dice;
            
            setOpponentState(prev => ({
              ...prev,
              dice: currentDice,
              rollCount: roll
            }));
            
            message.info(`Opponent Roll ${roll}: ${currentDice.join(', ')}`, 1);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            bestMove = calculateOptimalMove(currentDice, availableCategories, calculateScores);
          } else {
            break;
          }
        }

        // Calculate final score
        const finalScores = calculateScores(currentDice);
        let bestCategory = null;
        let bestScore = -1;

        availableCategories.forEach(category => {
          const score = finalScores[category.name] || 0;
          if (score > bestScore) {
            bestScore = score;
            bestCategory = category;
          }
        });

        if (!bestCategory || bestScore === undefined) {
          throw new Error('Invalid category or score data');
        }

        // Create turn record
        await API.createTurn(
          gameId,
          '9',
          currentDice,
          opponentState.rollCount,
          bestScore,
          false
        );

        // Submit score
        await API.submitGameScore(
          gameId,
          '9',
          bestCategory.name,
          bestScore
        );

        // Update opponent state
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
      } catch (error) {
        console.error('Error during opponent turn:', error);
        message.error('Opponent turn failed');
        setOpponentState(prev => ({
          ...prev,
          isOpponentTurn: false,
          rollCount: 0,
          dice: INITIAL_DICE_VALUES
        }));
      }
    }
  };

  executeOpponentTurn();
}, [opponentState.isOpponentTurn, gameId, gameMode]);

  // Set up multiplayer handlers
  useEffect(() => {
    if (!showMultiplayerLobby || !currentPlayer) return;

    const handleAvailablePlayers = (players) => {
      setAvailablePlayers(players.filter(p => p.id !== currentPlayer.player_id));
    };

    const handleGameRequest = async (request) => {
      Modal.confirm({
        title: 'Game Request',
        content: `${request.playerName} wants to play a game with you!`,
        okText: 'Accept',
        cancelText: 'Decline',
        onOk: () => handleAcceptGame(request),
        onCancel: () => handleDeclineGame(request)
      });
    };

    const handleGameStart = async ({ gameId: newGameId, opponentId, isFirstPlayer }) => {
      try {
        setGameId(newGameId);
        setGameMode('multiplayer');
        setIsMyTurn(isFirstPlayer);
        setOpponent(availablePlayers.find(p => p.id === opponentId));
        setShowMultiplayerLobby(false);

        await initializeMultiplayerGame(opponentId, isFirstPlayer);
      } catch (error) {
        console.error('Error starting multiplayer game:', error);
        message.error('Failed to start multiplayer game');
      }
    };

    chatService.on('available_players', handleAvailablePlayers);
    chatService.on('game_request', handleGameRequest);
    chatService.on('game_start', handleGameStart);
    chatService.emit('get_available_players');

    return () => {
      chatService.off('available_players', handleAvailablePlayers);
      chatService.off('game_request', handleGameRequest);
      chatService.off('game_start', handleGameStart);
    };
  }, [showMultiplayerLobby, currentPlayer]);

  // Helper Functions
  const calculateAllScores = (categories) => {
    const upperCategories = categories.filter(cat => cat.section === 'upper');
    const upperTotal = upperCategories.reduce((total, cat) => total + (cat.score || 0), 0);
    const upperBonus = upperTotal >= 63 ? 35 : 0;
    const yahtzeeCategory = categories.find(cat => cat.name === 'yahtzee');
    const hasYahtzee = yahtzeeCategory?.score === 50;
    const total = categories.reduce((sum, cat) => sum + (cat.score || 0), 0) + upperBonus;
    
    return { upperTotal, upperBonus, hasYahtzee, total };
  };

  const updatePlayerScores = (scores) => {
    setPlayerTotal(scores.total);
    setUpperSectionTotal(scores.upperTotal);
    setUpperSectionBonus(scores.upperBonus);
    setHasYahtzee(scores.hasYahtzee);
  };

  const resetGameState = async () => {
    resetTurnState({
      setDiceValues,
      setSelectedDice,
      setRollCount,
      setScores: setCurrentScores
    });
    setShouldResetScores(true);
    await resetPlayerCategories(currentPlayer.player_id);
    setTimeout(() => setShouldResetScores(false), 100);
  };

  // Game Actions
  const handleNewGame = async (mode = 'singleplayer') => {
    if (mode === 'multiplayer') {
      setShowMultiplayerLobby(true);
      setGameMode('multiplayer');
      return;
    }

    try {
      setIsLoading(true);
      await resetGameState();

      const result = await initializeGame(currentPlayer, mode, setGameId);
      if (result.success) {
        message.success('New game started!');
        setGameMode('singleplayer');
      }
    } catch (error) {
      console.error('Error starting new game:', error);
      message.error('Failed to start new game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestGame = (player) => {
    chatService.emit('send_game_request', {
      playerId: currentPlayer.player_id,
      opponentId: player.id
    });
    
    setPendingRequests(prev => [...prev, player.id]);
    message.info(`Game request sent to ${player.name}`);
  };

  const handleAcceptGame = async (request) => {
    chatService.emit('accept_game_request', {
      requestId: request.requestId,
      playerId: currentPlayer.player_id,
      opponentId: request.playerId
    });
  };

  const handleDeclineGame = (request) => {
    chatService.emit('decline_game_request', {
      requestId: request.requestId,
      playerId: currentPlayer.player_id,
      opponentId: request.playerId
    });
  };

  const initializeMultiplayerGame = async (opponentId, isFirstPlayer) => {
    try {
      setIsLoading(true);
      await resetGameState();
      
      const result = await initializeGame(
        currentPlayer,
        'multiplayer',
        setGameId,
        null,
        { opponentId, isFirstPlayer }
      );

      if (result.success) {
        message.success('Multiplayer game started!');
      } else {
        throw new Error(result.message);
      }
    } finally {
      setIsLoading(false);
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
        setRollCount(prev => prev + 1);

        if (gameMode === 'multiplayer') {
          chatService.emit('dice_roll', {
            gameId,
            playerId: currentPlayer.player_id,
            dice: result.dice,
            rollCount: rollCount + 1
          });
        }
      }
    } catch (error) {
      console.error('Roll dice error:', error);
      message.error('Failed to roll dice');
    } finally {
      setIsRolling(false);
    }
  };

  const handleScoreCategoryClick = async (categoryName) => {
    if (!gameId || !currentPlayer?.player_id || !categoryName) {
      message.error('Invalid game state');
      return;
    }
  
    try {
      const calculatedScores = calculateScores(diceValues);
      const categoryScore = calculatedScores[categoryName];
  
      await API.submitGameScore(
        gameId,
        currentPlayer.player_id,
        categoryName,
        categoryScore
      );
  
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      setPlayerCategories(updatedCategories);
      updatePlayerScores(calculateAllScores(updatedCategories));
  
      // Reset turn state using the helper function
      resetTurnState({
        setDiceValues,
        setSelectedDice,
        setRollCount,
        setScores: setCurrentScores
      });
  
      if (gameMode === 'multiplayer') {
        setIsMyTurn(false);
        chatService.emit('turn_end', {
          gameId,
          playerId: currentPlayer.player_id,
          category: categoryName,
          score: categoryScore
        });
      } else {
        setOpponentState(prev => ({ ...prev, isOpponentTurn: true }));
      }
  
      message.success(`Scored ${categoryScore} points in ${categoryName}!`);
    } catch (error) {
      console.error('Error submitting score:', error);
      message.error(`Failed to submit score: ${error.message}`);
    }
  };

  // Prepare props for view
  const viewProps = {
    currentPlayer,
    gameId,
    gameMode,
    diceValues,
    selectedDice,
    isRolling,
    rollCount,
    playerCategories,
    shouldResetScores,
    isLoading,
    opponentState,
    showMultiplayerLobby,
    availablePlayers,
    pendingRequests,
    isChatVisible,
    isMyTurn,
    opponent,
    setIsChatVisible,
    onRequestGame: handleRequestGame,
    onCloseMultiplayerLobby: () => setShowMultiplayerLobby(false),
    handleNewGame,
    handleLogout: () => handleLogout(navigate),
    handleRollDice,
    toggleDiceSelection: (index) => toggleDiceSelection(
      index,
      isRolling,
      !isMyTurn,
      setSelectedDice
    ),
    handleScoreCategoryClick,
    calculateScores,
    onTurnComplete: handleScoreCategoryClick
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;