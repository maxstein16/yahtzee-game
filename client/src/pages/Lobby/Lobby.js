// src/components/Lobby/Lobby.js
import React, { useState, useEffect } from 'react';
import { message, Layout } from 'antd';
import { useNavigate } from 'react-router-dom';
import { resetTurnState } from '../../services/gameStateService';
import { initializeGame, initializeDefaultCategories } from '../../services/lobbyService';
import { handleLogout, fetchCurrentPlayer } from '../../services/authService';
import { rollDice, toggleDiceSelection } from '../../services/diceService';
import { resetPlayerCategories, calculateScores } from '../../services/scoreTurnService';
import { calculateOptimalMove, getThresholdForCategory } from '../../services/opponentService';
import initializeWebSocket from '../../services/websocketService';
import LobbyView from './Lobby.jsx';
import LobbyChat from './LobbyChat.js';
import API from '../../utils/api';

const INITIAL_DICE_VALUES = [1, 1, 1, 1, 1];
const VIEW_STATES = {
  LOBBY: 'lobby',
  GAME: 'game'
};

function Lobby() {
  const navigate = useNavigate();

  // View state
  const [currentView, setCurrentView] = useState(VIEW_STATES.LOBBY);
  const [messages, setMessages] = useState([]);
  
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

  const [opponentState, setOpponentState] = useState({
    categories: [],
    dice: INITIAL_DICE_VALUES,
    score: 0,
    rollCount: 0,
    isOpponentTurn: false,
    lastCategory: null,
    turnScore: 0
  });

  // WebSocket setup
  useEffect(() => {
    if (currentPlayer?.player_id) {
      initializeWebSocket(gameId, currentPlayer.player_id)
        .then(socketConnection => {
          setSocket(socketConnection);
          
          socketConnection.on('connect', () => {
            console.log('Connected to game server');
            socketConnection.emit('playerJoined', {
              id: currentPlayer.player_id,
              name: currentPlayer.name,
              score: playerTotal
            });
          });

          socketConnection.on('playersUpdate', (players) => {
            setAvailablePlayers(players);
          });

          socketConnection.on('chatMessage', (message) => {
            setMessages(prev => [...prev, message]);
          });

          socketConnection.on('gameStarted', ({ gameId, players }) => {
            setGameId(gameId);
            setCurrentView(VIEW_STATES.GAME);
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

  // Modified handleNewGame
  const handleNewGame = async (gameType = 'singleplayer') => {
    if (!currentPlayer?.player_id) {
      message.error('No player found');
      return;
    }

    if (gameType === 'multiplayer') {
      setIsMultiplayerModalVisible(true);
      setCurrentView(VIEW_STATES.LOBBY);
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

      // [Rest of game initialization logic remains the same...]
      
      setCurrentView(VIEW_STATES.GAME);
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

  // Modified handlePlayerSelect
  const handlePlayerSelect = async (selectedPlayer) => {
    try {
      setIsLoading(true);
      const result = await initializeGame(currentPlayer, 'multiplayer', setGameId);
      if (result.success) {
        socket.emit('gameStarted', {
          gameId: result.gameId,
          players: [currentPlayer.player_id, selectedPlayer.id]
        });
        setCurrentView(VIEW_STATES.GAME);
        message.success('Multiplayer game started!');
      }
    } catch (error) {
      console.error('Error starting multiplayer game:', error);
      message.error('Failed to start multiplayer game');
    } finally {
      setIsLoading(false);
    }
  };

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

  const checkForYahtzeeBonus = (dice) => {
    if (!hasYahtzee) return false;
    return dice.every(value => value === dice[0]);
  };

  const calculateAllScores = (categories) => {
    const upperCategories = categories.filter(cat => cat.section === 'upper');
    const upperTotal = upperCategories.reduce((total, cat) => total + (cat.score || 0), 0);
    const upperBonus = upperTotal >= 63 ? 35 : 0;
    
    const yahtzeeCategory = categories.find(cat => cat.name === 'yahtzee');
    const hasYahtzeeBonus = yahtzeeCategory?.score === 50;
    
    const total = categories.reduce((sum, cat) => sum + (cat.score || 0), 0) + upperBonus;
    
    return {
      upperTotal,
      upperBonus,
      hasYahtzee: hasYahtzeeBonus,
      yahtzeeBonus: categories.filter(cat => cat.name === 'yahtzeeBonus')
        .reduce((sum, cat) => sum + (cat.score || 0), 0),
      total
    };
  };
  

  // Prepare shared props
  const sharedProps = {
    gameId,
    currentPlayer,
    socket,
    availablePlayers,
    onPlayerSelect: handlePlayerSelect
  };

  // Game-specific props
  const gameProps = {
    ...sharedProps,
    diceValues,
    selectedDice,
    isRolling,
    rollCount,
    playerCategories,
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
    onTurnComplete: handleScoreCategoryClick,
    shouldResetScores,
    isLoading,
    opponentState,
    isMultiplayerModalVisible,
    setIsMultiplayerModalVisible,
    messages,
    setCurrentView
  };

  if (isLoading) {
    return (
      <Layout style={{ height: '100vh' }}>
        <div className="flex justify-center items-center h-full">
          <div>Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      {currentView === VIEW_STATES.LOBBY ? (
        <LobbyChat {...sharedProps} messages={messages} />
      ) : (
        <LobbyView {...gameProps} />
      )}
    </Layout>
  );
}

export default Lobby;