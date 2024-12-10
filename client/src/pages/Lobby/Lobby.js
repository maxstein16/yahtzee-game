// src/components/Lobby/Lobby.js
import React, { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { resetTurnState } from '../../services/gameStateService';
import { initializeGame, initializeDefaultCategories } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { rollDice, toggleDiceSelection } from '../../services/diceService';
import { resetPlayerCategories, calculateScores } from '../../services/scoreTurnService';
import { calculateOptimalMove, getThresholdForCategory } from '../../services/opponentService';
import initializeWebSocket from '../../services/websocketService';
import LobbyView from './Lobby.jsx';
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

  // socket state
  const [socket, setSocket] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [isMultiplayerModalVisible, setIsMultiplayerModalVisible] = useState(false);

  useEffect(() => {
    if (currentPlayer?.player_id) {
      initializeWebSocket(gameId, currentPlayer.player_id)
        .then(socketConnection => {
          setSocket(socketConnection);
          
          // Set up socket event listeners
          socketConnection.on('connect', () => {
            console.log('Connected to game server');
            socketConnection.emit('playerJoined', {
              id: currentPlayer.player_id,
              name: currentPlayer.name,
              score: playerTotal
            });
          });

          socketConnection.on('playersUpdate', (players) => {
            console.log('Received players update:', players);
            setAvailablePlayers(players);
          });
        })
        .catch(error => {
          console.error('WebSocket connection error:', error);
          message.error('Failed to connect to game server');
        });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentPlayer?.player_id]);

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

  const resetOpponentTurn = () => {
    setOpponentState(prev => ({
      ...prev,
      isOpponentTurn: false,
      rollCount: 0,
      dice: INITIAL_DICE_VALUES
    }));
  };

  // Helper Functions
  const checkForYahtzeeBonus = (dice) => {
    if (!hasYahtzee) return false;
    return dice.every(value => value === dice[0]);
  };

  const updatePlayerScores = (scores) => {
    setPlayerTotal(scores.total);
    setUpperSectionTotal(scores.upperTotal);
    setUpperSectionBonus(scores.upperBonus);
    setYahtzeeBonus(scores.yahtzeeBonus);
    setHasYahtzee(scores.hasYahtzee);
  };

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

  // Initialize player
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

  // Initialize game session
  useEffect(() => {
    const initializeGameSession = async () => {
      if (!currentPlayer || isInitializing || isLoading) return;

      setIsInitializing(true);
      try {
        const result = await initializeGame(currentPlayer, 'singleplayer', setGameId, () => {});
        
        if (result.success) {
          if (!result.existingGame) {
            message.success(result.message);
          }
          
          let categories = await API.getPlayerCategories(currentPlayer.player_id);
          if (!categories || categories.length === 0) {
            categories = await initializeDefaultCategories(currentPlayer.player_id);
          }
          
          setPlayerCategories(categories);

          // Initialize opponent categories
          let opponentCategories = await API.getPlayerCategories('9');
          if (!opponentCategories || opponentCategories.length === 0) {
            opponentCategories = await initializeDefaultCategories('9');
          }
          setOpponentState(prev => ({ ...prev, categories: opponentCategories }));
          
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

  useEffect(() => {
    const executeOpponentTurn = async () => {
      if (opponentState.isOpponentTurn && gameId) {
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
          resetOpponentTurn();
        }
      }
    };

    executeOpponentTurn();
  }, [opponentState.isOpponentTurn, gameId, calculateScores]);

  // Handle new game
  const handleNewGame = async (gameType = 'singleplayer') => {
    if (!currentPlayer?.player_id) {
      message.error('No player found');
      return;
    }

    if (gameType === 'multiplayer') {
      setIsMultiplayerModalVisible(true);
      return;
    }
  
    try {
      setIsLoading(true);
  
      // End current game if exists
      if (gameId) {
        try {
          await API.endGame(gameId);
        } catch (endError) {
          console.log('Previous game already ended or not found:', endError);
        }
      }
  
      // Reset opponent categories first
      try {
        await API.resetPlayerCategories('9');
        // Wait a bit to ensure the reset completes
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (resetError) {
        console.error('Error resetting opponent categories:', resetError);
      }
  
      // Create new game
      let newGame;
      try {
        newGame = await API.createGame('pending', 0, currentPlayer.player_id);
      } catch (createError) {
        console.error('Error creating game:', createError);
        setIsNewGame(true);
        setGameId(null);
        return;
      }
  
      if (!newGame?.game_id) {
        setIsNewGame(true);
        setGameId(null);
        return;
      }
  
      // Initialize new game
      setGameId(newGame.game_id);
      await API.startGame(newGame.game_id);
      
      // Reset player state
      resetTurnState({
        setDiceValues: (values) => {
          setDiceValues(values);
          setCurrentScores(calculateScores(values));
        },
        setSelectedDice,
        setRollCount,
        setScores: setCurrentScores
      });
  
      // Reset player categories and reinitialize
      await resetPlayerCategories({
        currentPlayer,
        setPlayerCategories,
        setPlayerTotal
      });
  
      // Reset game state
      setHasYahtzee(false);
      setYahtzeeBonus(0);
      setUpperSectionTotal(0);
      setUpperSectionBonus(0);
  
      // Initialize new categories for opponent
      const opponentCategories = await initializeDefaultCategories('9');
      
      // Reset all opponent state
      setOpponentState({
        categories: opponentCategories,
        dice: INITIAL_DICE_VALUES,
        score: 0,
        rollCount: 0,
        isOpponentTurn: false,
        lastCategory: null,
        turnScore: 0
      });
  
      // Force scoreboard reset
      setShouldResetScores(true);
      
      // Get fresh categories for player
      const categories = await API.getPlayerCategories(currentPlayer.player_id);
      setPlayerCategories(categories);
  
      // Reset shouldResetScores after a delay
      setTimeout(() => {
        setShouldResetScores(false);
      }, 100);
  
      message.success('New game started successfully!');
    } catch (error) {
      console.error('Error during game initialization:', error);
      message.error('Failed to start new game');
      setIsNewGame(true);
      setGameId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerSelect = async (selectedPlayer) => {
    try {
      setIsLoading(true);
      // Create a new multiplayer game
      const result = await initializeGame(currentPlayer, 'multiplayer', setGameId);
      if (result.success) {
        socket.emit('gameStarted', {
          gameId: result.gameId,
          players: [currentPlayer.player_id, selectedPlayer.id]
        });
        message.success('Multiplayer game started!');
      }
    } catch (error) {
      console.error('Error starting multiplayer game:', error);
      message.error('Failed to start multiplayer game');
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
  
    if (!categoryName) {
      message.error('No category selected');
      return;
    }
  
    try {
      // Calculate scores with current dice
      const calculatedScores = calculateScores(diceValues);
      
      // Debug log
      console.log('Submitting score for category:', categoryName);
      console.log('Current dice:', diceValues);
      console.log('Calculated scores:', calculatedScores);
  
      // Verify we have a valid category and score
      if (!calculatedScores.hasOwnProperty(categoryName)) {
        throw new Error(`Invalid category: ${categoryName}`);
      }
      
      const categoryScore = calculatedScores[categoryName];
      if (typeof categoryScore !== 'number') {
        throw new Error('Invalid score calculation');
      }  

      console.log('Submitting score:', {
        categoryName,
        categoryScore,
        diceValues,
        rollCount
      });

      // Handle Yahtzee scoring
      if (categoryName === 'yahtzee' && categoryScore === 50) {
        setHasYahtzee(true);
      } else if (hasYahtzee && checkForYahtzeeBonus(diceValues)) {
        const newBonus = yahtzeeBonus + 100;
        setYahtzeeBonus(newBonus);
        await API.submitYahtzeeBonus(gameId, currentPlayer.player_id, newBonus);
        message.success('Yahtzee Bonus! +100 points');
      }

      // Create turn record first
      await API.createTurn(
        gameId, 
        currentPlayer.player_id, 
        diceValues, 
        rollCount, 
        categoryScore, 
        false
      );

      // Submit score with verified data
      await API.submitGameScore(
        gameId,
        currentPlayer.player_id,
        categoryName,
        categoryScore
      );

      // Update categories and scores
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
      
      // Start opponent turn
      setOpponentState(prev => ({
        ...prev,
        isOpponentTurn: true
      }));

      message.success(`Scored ${categoryScore} points in ${categoryName}!`);
    } catch (error) {
      console.error('Error submitting score:', error);
      message.error(`Failed to submit score: ${error.message}`);
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

  // Prepare view props
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
    socket,
    isMultiplayerModalVisible,
    availablePlayers,
    setIsMultiplayerModalVisible,
    onPlayerSelect: handlePlayerSelect,
    handleNewGame,
    handleLogout: () => handleLogout(navigate),
    handleRollDice: handleDiceRoll,
    toggleDiceSelection: (index) => toggleDiceSelection(
      index,
      isRolling,
      false,
      setSelectedDice
    ),
    handleScoreCategoryClick,
    calculateScores,
    onTurnComplete: handleScoreCategoryClick
  };

  return <LobbyView {...viewProps} />;
}

export default Lobby;