import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import GameBoard from '../components/GameBoard/GameBoard';
import GameHeader from '../components/GameHeader/GameHeader';
import Scoreboard from '../components/ScoreBoard/ScoreBoard';
import { handleLogout, fetchCurrentPlayer } from '../services/authService';
import API from '../utils/api';
import initializeWebSocket from '../services/websocketService';

function MultiplayerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId, isChallenger, opponent } = location.state || {};

  // Game state
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]);
  const [selectedDice, setSelectedDice] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(isChallenger);

  // Initialize player and game
  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Get current player data
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);
        }

        // Initialize WebSocket connection
        const socketConnection = await initializeWebSocket(playerInfo.playerData.player_id);
        setSocket(socketConnection);

        // Initialize player categories if needed
        await API.initializePlayerCategories(playerInfo.playerData.player_id);

        // Listen for opponent's moves
        socketConnection.on('opponentRoll', ({ dice }) => {
          setDiceValues(dice);
        });

        socketConnection.on('turnChange', ({ nextPlayer }) => {
          setIsMyTurn(nextPlayer === playerInfo.playerData.player_id);
          setRollCount(0);
          setSelectedDice([]);
          setDiceValues([1, 1, 1, 1, 1]);
        });

        socketConnection.on('gameEnd', ({ winner }) => {
          message.success(`Game Over! ${winner.name} wins!`);
          navigate('/lobby');
        });

      } catch (error) {
        console.error('Error initializing multiplayer game:', error);
        message.error('Failed to initialize game');
        navigate('/lobby');
      }
    };

    if (gameId) {
      initializeGame();
    } else {
      navigate('/lobby');
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [gameId, navigate]);

  const handleDiceRoll = async () => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }

    try {
      setIsRolling(true);
      const response = await API.rollDice(gameId, {
        playerId: currentPlayer.player_id,
        currentDice: diceValues,
        keepIndices: selectedDice
      });

      setDiceValues(response.dice);
      setRollCount((prev) => prev + 1);
      
      // Emit roll to opponent
      if (socket) {
        socket.emit('diceRoll', {
          dice: response.dice,
          gameId: gameId
        });
      }
    } catch (error) {
      console.error('Error rolling dice:', error);
      message.error('Failed to roll dice');
    } finally {
      setIsRolling(false);
    }
  };

  const handleScoreCategoryClick = async (categoryName) => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }

    try {
      const score = calculateScore(categoryName, diceValues);
      await API.submitGameScore(gameId, currentPlayer.player_id, categoryName, score);
      
      // Emit turn end to opponent
      if (socket) {
        socket.emit('turnEnd', {
          gameId: gameId,
          nextPlayer: opponent.id
        });
      }

      setRollCount(0);
      setSelectedDice([]);
      setDiceValues([1, 1, 1, 1, 1]);
      setIsMyTurn(false);
    } catch (error) {
      console.error('Error submitting score:', error);
      message.error('Failed to submit score');
    }
  };

  const calculateScore = (categoryName, dice) => {
    // Implement score calculation logic here
    return 0; // Placeholder
  };

  const toggleDiceSelection = (index) => {
    if (isRolling || !isMyTurn || rollCount === 0) return;

    setSelectedDice(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  return (
    <Layout className="min-h-screen">
      <GameHeader
        currentPlayer={currentPlayer}
        handleLogout={() => handleLogout(navigate)}
        handleNewGame={() => navigate('/lobby')}
      />
      
      <Layout.Content className="p-6">
        <div className="flex gap-6">
          <GameBoard
            currentPlayer={currentPlayer}
            opponent={opponent}
            diceValues={diceValues}
            selectedDice={selectedDice}
            isRolling={isRolling}
            rollCount={rollCount}
            isMyTurn={isMyTurn}
            toggleDiceSelection={toggleDiceSelection}
            handleRollDice={handleDiceRoll}
          />

          <div className="flex gap-4">
            <Scoreboard
              currentPlayer={currentPlayer}
              diceValues={diceValues}
              rollCount={rollCount}
              handleScoreCategoryClick={handleScoreCategoryClick}
              gameId={gameId}
              isMyTurn={isMyTurn}
            />
            <Scoreboard
              currentPlayer={opponent}
              diceValues={diceValues}
              rollCount={rollCount}
              gameId={gameId}
              isOpponent
            />
          </div>
        </div>
      </Layout.Content>
    </Layout>
  );
}

export default MultiplayerPage;