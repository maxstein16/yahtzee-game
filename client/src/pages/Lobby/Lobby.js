import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  initializeGame,
  initializeDefaultCategories,
} from '../../services/lobbyService';
import {
  handleLogout,
  fetchCurrentPlayer,
} from '../../services/authService';
import { rollDice, toggleDiceSelection } from '../../services/diceService';
import {
  resetPlayerCategories,
  calculateScores,
} from '../../services/scoreTurnService';
import { calculateOptimalMove, getThresholdForCategory } from '../../services/opponentService';
import LobbyView from './Lobby.jsx';
import API from '../../utils/api';

const INITIAL_DICE_VALUES = [1, 1, 1, 1, 1];

function Lobby() {
  const navigate = useNavigate();

  // Game states
  const [gameId, setGameId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [gameMode, setGameMode] = useState('singleplayer');

  // Player and scoring states
  const [playerCategories, setPlayerCategories] = useState([]);
  const [diceValues, setDiceValues] = useState(INITIAL_DICE_VALUES);
  const [selectedDice, setSelectedDice] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [currentScores, setCurrentScores] = useState({});
  const [playerTotal, setPlayerTotal] = useState(0);
  const [upperSectionTotal, setUpperSectionTotal] = useState(0);
  const [upperSectionBonus, setUpperSectionBonus] = useState(0);
  const [hasYahtzee, setHasYahtzee] = useState(false);
  const [yahtzeeBonus, setYahtzeeBonus] = useState(0);

  // Opponent states
  const [opponentState, setOpponentState] = useState({
    categories: [],
    dice: INITIAL_DICE_VALUES,
    score: 0,
    rollCount: 0,
    isOpponentTurn: false,
    lastCategory: null,
    turnScore: 0,
  });

  useEffect(() => {
    // Initialize player data
    const initializePlayer = async () => {
      setIsLoading(true);
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);

          const categories = await API.getPlayerCategories(playerInfo.playerData.player_id) ||
            await initializeDefaultCategories(playerInfo.playerData.player_id);

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

  useEffect(() => {
    // Initialize game session when player data is ready
    if (currentPlayer && !isLoading) {
      initializeGameSession();
    }
  }, [currentPlayer, isLoading]);

  const initializeGameSession = async () => {
    try {
      const result = await initializeGame(currentPlayer, gameMode, setGameId);
      if (result.success) {
        const categories = await API.getPlayerCategories(currentPlayer.player_id);
        setPlayerCategories(categories);
        const scores = calculateAllScores(categories);
        updatePlayerScores(scores);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error initializing game session:', error);
      message.error('Failed to initialize game session');
    }
  };

  const updatePlayerScores = (scores) => {
    setPlayerTotal(scores.total);
    setUpperSectionTotal(scores.upperTotal);
    setUpperSectionBonus(scores.upperBonus);
    setHasYahtzee(scores.hasYahtzee);
    setYahtzeeBonus(scores.yahtzeeBonus);
  };

  const calculateAllScores = (categories) => {
    const upperCategories = categories.filter((cat) => cat.section === 'upper');
    const upperTotal = upperCategories.reduce((total, cat) => total + (cat.score || 0), 0);
    const upperBonus = upperTotal >= 63 ? 35 : 0;

    const yahtzeeCategory = categories.find((cat) => cat.name === 'yahtzee');
    const hasYahtzee = yahtzeeCategory?.score === 50;

    const total = categories.reduce((sum, cat) => sum + (cat.score || 0), 0) + upperBonus;

    return {
      upperTotal,
      upperBonus,
      hasYahtzee,
      yahtzeeBonus: categories.filter((cat) => cat.name === 'yahtzeeBonus').reduce((sum, cat) => sum + (cat.score || 0), 0),
      total,
    };
  };

  const handleNewGame = async (mode = 'singleplayer') => {
    setGameMode(mode);
    try {
      setIsLoading(true);
      await API.endGame(gameId);

      const playerCategories = await initializeDefaultCategories(currentPlayer.player_id);
      setPlayerCategories(playerCategories);

      const scores = calculateAllScores(playerCategories);
      updatePlayerScores(scores);

      const result = await initializeGame(currentPlayer, mode, setGameId);
      if (!result.success) throw new Error(result.message);

      message.success('Game started successfully!');
    } catch (error) {
      console.error('Error starting a new game:', error);
      message.error('Failed to start a new game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiceRoll = async () => {
    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    try {
      const result = await rollDice(gameId, currentPlayer, diceValues, selectedDice);
      if (result.success) {
        setDiceValues(result.dice);
        setCurrentScores(calculateScores(result.dice));
        setRollCount((prev) => prev + 1);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Roll dice error:', error);
      message.error('Failed to roll dice');
    }
  };

  return (
    <LobbyView
      currentPlayer={currentPlayer}
      gameId={gameId}
      diceValues={diceValues}
      selectedDice={selectedDice}
      rollCount={rollCount}
      isRolling={false}
      playerCategories={playerCategories}
      gameMode={gameMode}
      setIsChatVisible={setIsChatVisible}
      isChatVisible={isChatVisible}
      handleNewGame={handleNewGame}
      handleDiceRoll={handleDiceRoll}
      isLoading={isLoading}
      opponentState={opponentState}
    />
  );
}

export default Lobby;
