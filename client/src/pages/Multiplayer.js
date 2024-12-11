import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import GameBoard from '../components/GameBoard/GameBoard';
import GameHeader from '../components/GameHeader/GameHeader';
import Scoreboard from '../components/ScoreBoard/ScoreBoard';
import { handleLogout, fetchCurrentPlayer } from '../services/authService';
import API from '../utils/api';
import initializeWebSocket from '../services/websocketService';

const MultiplayerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId, isChallenger, opponent } = location.state || {};

  // Game state
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [playerCategories, setPlayerCategories] = useState([]);
  const [opponentCategories, setOpponentCategories] = useState([]);
  const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]);
  const [opponentDiceValues, setOpponentDiceValues] = useState([1, 1, 1, 1, 1]);
  const [selectedDice, setSelectedDice] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(isChallenger);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [opponentTotal, setOpponentTotal] = useState(0);

  // Initialize socket connection with retry mechanism
  const initializeSocket = async (playerId) => {
    try {
      // Only initialize if we don't have a valid connection
      if (!socket?.getState().connected) {
        const socketConnection = await initializeWebSocket(playerId);
        setSocket(socketConnection);
        
        socketConnection.on('connect', () => {
          console.log('Socket connected');
          message.success('Connected to game server');
        });

        return socketConnection;
      }
      return socket;
    } catch (error) {
      console.error('Socket initialization error:', error);
      message.error('Failed to connect to game server');
      return null;
    }
  };

  // Initialize game state and socket connection
  useEffect(() => {
    let mounted = true;

    const initializeGame = async () => {
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (!mounted) return;

        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);
          
          // Initialize categories
          await API.initializePlayerCategories(playerInfo.playerData.player_id);
          const categories = await API.getPlayerCategories(playerInfo.playerData.player_id);
          if (!mounted) return;
          setPlayerCategories(categories);

          if (opponent?.id) {
            const opponentCats = await API.getPlayerCategories(opponent.id);
            if (!mounted) return;
            setOpponentCategories(opponentCats);
          }

          const socketConnection = await initializeSocket(playerInfo.playerData.player_id);
          if (!mounted || !socketConnection) return;

          // Set up socket event handlers
          socketConnection.on('opponentRoll', ({ dice }) => {
            if (!mounted) return;
            setOpponentDiceValues(dice);
            message.info("Opponent rolled the dice!");
          });

          socketConnection.on('turnChange', ({ nextPlayer, diceValues: newDice }) => {
            if (!mounted) return;
            const isMyNewTurn = nextPlayer === playerInfo.playerData.player_id;
            setIsMyTurn(isMyNewTurn);

            if (isMyNewTurn) {
              setDiceValues([1, 1, 1, 1, 1]);
              setRollCount(0);
              setSelectedDice([]);
              message.success("It's your turn!");
            } else {
              setOpponentDiceValues(newDice || [1, 1, 1, 1, 1]);
              message.info("Opponent's turn");
            }
          });

          socketConnection.on('categoriesUpdate', async ({ playerId, categories }) => {
            if (!mounted) return;
            
            try {
              if (playerId === playerInfo.playerData.player_id) {
                setPlayerCategories(categories);
                const total = await API.getPlayerTotalScore(playerId);
                setPlayerTotal(total.totalScore);
              } else {
                setOpponentCategories(categories);
                const total = await API.getPlayerTotalScore(playerId);
                setOpponentTotal(total.totalScore);
              }
            } catch (error) {
              console.error('Error updating categories:', error);
            }
          });
        }
      } catch (error) {
        console.error('Error initializing game:', error);
        if (mounted) {
          message.error('Failed to initialize game');
          navigate('/lobby');
        }
      }
    };

    if (gameId) {
      initializeGame();
    }

    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [gameId, navigate, opponent?.id]);

  // Handle dice rolling
  const handleDiceRoll = async () => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }

    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    setIsRolling(true);
    try {
      const result = await API.rollDice(gameId, {
        playerId: currentPlayer?.player_id,
        currentDice: diceValues,
        keepIndices: selectedDice
      });

      setDiceValues(result.dice);
      setRollCount(prev => prev + 1);

      socket?.emit('diceRoll', {
        dice: result.dice,
        gameId
      });
    } catch (error) {
      console.error('Roll dice error:', error);
      message.error('Failed to roll dice');
    } finally {
      setIsRolling(false);
    }
  };

  // Calculate scores for each category
  const calculateScores = (dice) => {
    const counts = new Array(7).fill(0);
    dice.forEach(value => counts[value]++);

    return {
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
  };

  // Handle category selection
  const handleScoreCategoryClick = async (categoryName) => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }

    if (!gameId || !currentPlayer?.player_id) {
      message.error('Game or player information missing');
      return;
    }

    try {
      const calculatedScores = calculateScores(diceValues);
      const score = calculatedScores[categoryName];

      const category = playerCategories.find(cat => cat.name === categoryName);
      if (!category) {
        throw new Error('Category not found');
      }

      await API.submitTurn(
        gameId, 
        currentPlayer.player_id, 
        category.category_id, 
        score,
        diceValues,
        rollCount
      );

      socket?.emit('scoreCategory', {
        gameId,
        categoryName,
        score,
        nextPlayerId: opponent.id
      });

      setIsMyTurn(false);
      setRollCount(0);
      setSelectedDice([]);
      setDiceValues([1, 1, 1, 1, 1]);

      message.success(`Scored ${score} points in ${categoryName}!`);
    } catch (error) {
      console.error('Error submitting score:', error);
      message.error('Failed to submit score');
    }
  };

  // Add this before the return statement, alongside other functions like handleDiceRoll
const handleTurnComplete = (categoryName) => {
  // Reset dice and roll state
  setDiceValues([1, 1, 1, 1, 1]);
  setRollCount(0);
  setSelectedDice([]);

  // Update turn state
  setIsMyTurn(false);

  // Notify opponent through socket
  socket?.emit('turnComplete', {
    gameId,
    categoryName,
    nextPlayerId: opponent.id
  });

  // Show turn completion message
  message.info("Turn complete - waiting for opponent");
};

  // Handle dice selection
  const toggleDiceSelection = (index) => {
    if (!isMyTurn || isRolling) return;

    setSelectedDice(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <Layout className="min-h-screen">
      <GameHeader
        currentPlayer={currentPlayer}
        handleLogout={() => handleLogout(navigate)}
      />

      <Layout.Content className="p-6">
        <div className="flex gap-6">
          <GameBoard
            currentPlayer={currentPlayer}
            playerTotal={playerTotal}
            isMyTurn={isMyTurn}
            diceValues={diceValues}
            selectedDice={selectedDice}
            isRolling={isRolling}
            rollCount={rollCount}
            toggleDiceSelection={toggleDiceSelection}
            handleDiceRoll={handleDiceRoll}
            gameId={gameId}
            opponent={opponent}
            opponentTotal={opponentTotal}
            opponentDiceValues={opponentDiceValues}
          />

          <div className="flex gap-4">
            <Scoreboard
              currentPlayer={currentPlayer}
              playerCategories={playerCategories}
              calculateScores={calculateScores}
              diceValues={diceValues}
              rollCount={rollCount}
              handleScoreCategoryClick={handleScoreCategoryClick}
              onTurnComplete={handleTurnComplete}
              gameId={gameId}
            />
            <Scoreboard
              currentPlayer={opponent}
              playerCategories={opponentCategories}
              calculateScores={calculateScores}
              diceValues={opponentDiceValues}
              rollCount={0}
              handleScoreCategoryClick={() => {}}
              onTurnComplete={() => {}} 
              gameId={gameId}
              isOpponent={true}
            />
          </div>
        </div>
      </Layout.Content>
    </Layout>
  );
};

export default MultiplayerPage;