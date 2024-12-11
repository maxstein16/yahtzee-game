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

  // Initialize player and game
  useEffect(() => {
    const initializeGame = async () => {
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);
          
          // Initialize categories for both players
          await API.initializePlayerCategories(playerInfo.playerData.player_id);
          const categories = await API.getPlayerCategories(playerInfo.playerData.player_id);
          setPlayerCategories(categories);
          
          if (opponent?.id) {
            const opponentCats = await API.getPlayerCategories(opponent.id);
            setOpponentCategories(opponentCats);
          }
        }

        const socketConnection = await initializeWebSocket(playerInfo.playerData.player_id);
        setSocket(socketConnection);

        // Set up socket event listeners
        socketConnection.on('opponentRoll', ({ dice }) => {
          setOpponentDiceValues(dice);
          message.info("Opponent rolled the dice!");
        });

        socketConnection.on('turnChange', ({ nextPlayer, diceValues: newDice }) => {
          const isMyNewTurn = nextPlayer === playerInfo.playerData.player_id;
          setIsMyTurn(isMyNewTurn);
          
          if (isMyNewTurn) {
            setDiceValues([1, 1, 1, 1, 1]);
            setRollCount(0);
            setSelectedDice([]);
            message.success("It's your turn!");
          } else {
            setOpponentDiceValues([1, 1, 1, 1, 1]);
            message.info("Opponent's turn");
          }
        });

        socketConnection.on('categoriesUpdate', ({ categories, playerId }) => {
          if (playerId === playerInfo.playerData.player_id) {
            setPlayerCategories(categories);
            calculateTotalScore(categories).then(setPlayerTotal);
          } else {
            setOpponentCategories(categories);
            calculateTotalScore(categories).then(setOpponentTotal);
          }
        });

      } catch (error) {
        console.error('Error initializing game:', error);
        message.error('Failed to initialize game');
        navigate('/lobby');
      }
    };

    if (gameId) {
      initializeGame();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [gameId, navigate, opponent?.id]);

  const calculateTotalScore = async (categories) => {
    return categories.reduce((total, category) => {
      return total + (category.score || 0);
    }, 0);
  };

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
        keepIndices: selectedDice,
      });

      setDiceValues(result.dice);
      setRollCount((prev) => prev + 1);
      
      // Emit dice roll to opponent
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

  const handleScoreCategoryClick = async (categoryName) => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }

    try {
      const calculatedScores = calculateScores(diceValues);
      const score = calculatedScores[categoryName];

      // Submit score
      await API.submitGameScore(gameId, currentPlayer.player_id, categoryName, score);

      // Notify opponent through socket
      socket?.emit('scoreCategory', {
        gameId,
        categoryName,
        score,
        nextPlayerId: opponent.id
      });

      // Update local state
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

  const toggleDiceSelection = (index) => {
    if (!isMyTurn || isRolling) return;
    
    setSelectedDice(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

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

  const handleNewGame = async () => {
    try {
      if (!socket || !opponent) {
        throw new Error('Missing socket connection or opponent information');
      }

      // Reset current player's categories
      await API.resetPlayerCategories(currentPlayer.player_id);

      // Create new game
      const response = await API.createGame('pending', 0, currentPlayer.player_id);
      
      if (!response?.game?.game_id) {
        throw new Error('Failed to create new game');
      }

      // Initialize categories for current player
      await API.initializePlayerCategories(currentPlayer.player_id);

      // Send challenge to opponent for new game
      socket.emit('gameChallenge', {
        challenger: {
          id: currentPlayer.player_id,
          name: currentPlayer.name
        },
        opponentId: opponent.id,
        gameId: response.game.game_id
      });

      // Update local state
      setDiceValues([1, 1, 1, 1, 1]);
      setOpponentDiceValues([1, 1, 1, 1, 1]);
      setRollCount(0);
      setSelectedDice([]);
      setIsMyTurn(true);
      setIsRolling(false);

      // Navigate to new game
      navigate('/multiplayer', {
        state: {
          gameId: response.game.game_id,
          isChallenger: true,
          opponent: opponent
        },
        replace: true
      });

      message.success('New game challenge sent to opponent!');
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
              gameId={gameId}
              isMyTurn={isMyTurn}
            />
            <Scoreboard
              currentPlayer={opponent}
              playerCategories={opponentCategories}
              calculateScores={calculateScores}
              diceValues={opponentDiceValues}
              rollCount={0}
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