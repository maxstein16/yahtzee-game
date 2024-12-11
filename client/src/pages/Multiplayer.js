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
  const [selectedDice, setSelectedDice] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(isChallenger);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [opponentTotal, setOpponentTotal] = useState(0);

  // Initialize socket connection
  const initializeSocket = async (playerId) => {
    try {
      const socketConnection = await initializeWebSocket(playerId);
      setSocket(socketConnection);
      
      // Listen for turn changes
      socketConnection.on('turnChange', ({ nextPlayer }) => {
        const isMyNewTurn = nextPlayer === playerId;
        setIsMyTurn(isMyNewTurn);
        
        if (isMyNewTurn) {
          setDiceValues([1, 1, 1, 1, 1]);
          setRollCount(0);
          setSelectedDice([]);
          message.success("It's your turn!");
        } else {
          message.info("Opponent's turn");
        }
      });

      return socketConnection;
    } catch (error) {
      console.error('Socket initialization error:', error);
      message.error('Failed to connect to game server');
      return null;
    }
  };

  // Initialize game state
  useEffect(() => {
    let mounted = true;

    const initializeGame = async () => {
      try {
        const playerInfo = await fetchCurrentPlayer(navigate);
        if (!mounted) return;

        if (playerInfo) {
          setCurrentPlayer(playerInfo.playerData);
          
          await API.initializePlayerCategories(playerInfo.playerData.player_id);
          const categories = await API.getPlayerCategories(playerInfo.playerData.player_id);
          if (!mounted) return;
          setPlayerCategories(categories);

          if (opponent?.id) {
            const opponentCats = await API.getPlayerCategories(opponent.id);
            if (!mounted) return;
            setOpponentCategories(opponentCats);
          }

          await initializeSocket(playerInfo.playerData.player_id);

          // Fetch initial game state
          await updateGameState(playerInfo.playerData.player_id);
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

  const updateGameState = async (playerId) => {
    try {
      const [gameState, turnState, diceState] = await Promise.all([
        API.getGameById(gameId),
        API.getLatestTurn(gameId, playerId),
        API.getGameDice(gameId, playerId)
      ]);

      setDiceValues(diceState.dice);
      setRollCount(diceState.rollCount);
      setIsMyTurn(turnState.playerId === playerId);
      setPlayerTotal(await API.getPlayerTotalScore(playerId));

      if (opponent?.id) {
        setOpponentTotal(await API.getPlayerTotalScore(opponent.id));
      }
    } catch (error) {
      console.error('Error updating game state:', error);
    }
  };

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

      // Submit the turn
      await API.submitTurn(
        gameId, 
        currentPlayer.player_id, 
        category.category_id, 
        score,
        diceValues,
        rollCount
      );

      // Reset turn state
      setIsMyTurn(false);
      setRollCount(0);
      setSelectedDice([]);
      setDiceValues([1, 1, 1, 1, 1]);

      // Notify opponent through socket that it's their turn
      socket?.emit('turnEnd', {
        gameId,
        nextPlayer: opponent.id
      });

      message.success(`Scored ${score} points in ${categoryName}!`);

      // Refresh categories
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      setPlayerCategories(updatedCategories);
      const total = await API.getPlayerTotalScore(currentPlayer.player_id);
      setPlayerTotal(total.totalScore);
    } catch (error) {
      console.error('Error submitting score:', error);
      message.error('Failed to submit score');
    }
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
            />
            <Scoreboard
              currentPlayer={opponent}
              playerCategories={opponentCategories}
              calculateScores={calculateScores}
              rollCount={0}
              handleScoreCategoryClick={() => {}}
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