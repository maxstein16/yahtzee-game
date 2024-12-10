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
import LobbyView from './LobbyView';
import LobbyChat from './LobbyChat';
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

  // [Rest of the game logic functions remain the same...]

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