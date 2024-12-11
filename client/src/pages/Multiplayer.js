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
  const [playerCategories, setPlayerCategories] = useState([]); // Add this
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
          
          // Initialize player categories
          await API.initializePlayerCategories(playerInfo.playerData.player_id);
          const categories = await API.getPlayerCategories(playerInfo.playerData.player_id);
          setPlayerCategories(categories);
        }

        // Initialize WebSocket connection
        const socketConnection = await initializeWebSocket(playerInfo.playerData.player_id);
        setSocket(socketConnection);

        // Listen for opponent's moves
        socketConnection.on('opponentRoll', ({ dice }) => {
          setDiceValues(dice);
        });

        socketConnection.on('turnChange', ({ nextPlayer }) => {
            setIsMyTurn(nextPlayer === currentPlayer.player_id);
            setRollCount(0);
            setSelectedDice([]);
            setDiceValues([1, 1, 1, 1, 1]);
        });

        socketConnection.on('gameStart', async ({ gameId, players }) => {
            try {
                await API.startGame(gameId);
                
              setIsMyTurn(players[0] === currentPlayer.player_id);
          
              // Initialize categories for the new game
              await API.initializePlayerCategories(currentPlayer.player_id);
          
              // Fetch updated categories
              const categories = await API.getPlayerCategories(currentPlayer.player_id);
              setPlayerCategories(categories);
          
              message.success('Game started!');
            } catch (error) {
              console.error('Error handling gameStart event:', error);
              message.error('Failed to initialize game.');
            }
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

  useEffect(() => {
    if (currentPlayer?.player_id) {
      socket?.on('opponentRoll', ({ dice }) => {
        setDiceValues(dice);
      });
  
      socket?.on('turnChange', ({ nextPlayer }) => {
        setIsMyTurn(nextPlayer === currentPlayer.player_id);
        if (nextPlayer === currentPlayer.player_id) {
          message.info("It's your turn!");
          setRollCount(0);
          setSelectedDice([]);
          setDiceValues([1, 1, 1, 1, 1]);
        }
      });
  
      socket?.on('gameEnd', ({ winner }) => {
        message.success(`Game Over! ${winner.name} wins!`);
        navigate('/lobby');
      });
    }
  
    return () => {
      if (socket) {
        socket.off('opponentRoll');
        socket.off('turnChange');
        socket.off('gameEnd');
      }
    };
  }, [currentPlayer, socket, navigate]);

  useEffect(() => {
    if (!location.state || !location.state.gameId || !location.state.opponent) {
      message.error('Invalid game parameters');
      navigate('/lobby');
      return;
    }
  }, [location.state, navigate]);

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
        keepIndices: selectedDice,
      });
  
      setDiceValues(response.dice);
      setRollCount((prev) => prev + 1);
  
      if (socket) {
        socket.emit('diceRoll', {
          dice: response.dice,
          gameId: gameId,
        });
      }
    } catch (error) {
      message.error('Failed to roll dice');
    } finally {
      setIsRolling(false);
    }
  };
  

  const calculateScores = (dice) => {
    const counts = new Array(7).fill(0);
    dice.forEach(value => counts[value]++);
  
    const scores = {
      ones: counts[1] * 1,
      twos: counts[2] * 2,
      threes: counts[3] * 3,
      fours: counts[4] * 4,
      fives: counts[5] * 5,
      sixes: counts[6] * 6,
      threeOfAKind: counts.some(count => count >= 3) ? dice.reduce((sum, val) => sum + val, 0) : 0,
      fourOfAKind: counts.some(count => count >= 4) ? dice.reduce((sum, val) => sum + val, 0) : 0,
      fullHouse: counts.some(count => count === 3) && counts.some(count => count === 2) ? 25 : 0,
      smallStraight: [...counts.slice(1)].join('').includes('1111') ? 30 : 0,
      largeStraight: [...counts.slice(1)].join('').includes('11111') ? 40 : 0,
      yahtzee: counts.some(count => count === 5) ? 50 : 0,
      chance: dice.reduce((sum, val) => sum + val, 0)
    };
  
    return scores;
  };

  const handleScoreCategoryClick = async (categoryName) => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }
  
    try {
      const scores = calculateScores(diceValues);
      const score = scores[categoryName];
      await API.submitGameScore(gameId, currentPlayer.player_id, categoryName, score);
  
      if (socket) {
        socket.emit('turnEnd', {
          gameId: gameId,
          nextPlayer: opponent.id,
        });
      }
  
      setRollCount(0);
      setSelectedDice([]);
      setDiceValues([1, 1, 1, 1, 1]);
      setIsMyTurn(false);
  
      message.success(`Scored ${score} points for ${categoryName}`);
    } catch (error) {
      message.error('Failed to submit score');
    }
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

  // In MultiplayerPage.js
  const handleNewGame = async () => {
    try {
      if (!socket) {
        throw new Error('Socket connection is not established.');
      }
  
      if (currentPlayer?.player_id) {
        await API.resetPlayerCategories(currentPlayer.player_id);
      }
      if (opponent?.id) {
        await API.resetPlayerCategories(opponent.id);
      }
  
      // Create the game
      const response = await API.createGame('pending', 0, currentPlayer?.player_id, opponent?.id);
  
      if (response?.game?.game_id) {
        // Emit WebSocket event to start the game
        socket.emit('gameStart', {
          gameId: response.game.game_id,
          players: [currentPlayer.player_id, opponent.id],
        });
  
        // Navigate to the new game
        navigate('/multiplayer', {
          state: {
            gameId: response.game.game_id,
            isChallenger: true,
            opponent: opponent,
          },
        });
      } else {
        throw new Error('Failed to create a new game.');
      }
    } catch (error) {
      console.error('Error creating new game:', error);
      message.error('Failed to create new game');
    }
  };
   
  
  return (
    <Layout className="min-h-screen">
      <GameHeader
        currentPlayer={currentPlayer}
        handleLogout={() => handleLogout(navigate)}
        handleNewGame={handleNewGame}
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
              playerCategories={playerCategories} // Add this
              calculateScores={calculateScores}   // Add this
              diceValues={diceValues}
              rollCount={rollCount}
              handleScoreCategoryClick={handleScoreCategoryClick}
              onTurnComplete={() => {}} // Add a proper turn complete handler if needed
              gameId={gameId}
              isMyTurn={isMyTurn}
            />
            <Scoreboard
              currentPlayer={opponent}
              playerCategories={playerCategories} // Add this
              calculateScores={calculateScores}   // Add this
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