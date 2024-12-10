import React, { useState, useEffect } from 'react';
import { Layout, Space, Button, message } from 'antd';
import Dice from '../../pages/Dice';
import Scoreboard from '../ScoreBoard/ScoreBoard';
import { handleRollDice, toggleDiceSelection } from '../../services/diceService';
import { calculateScores } from '../../services/scoreTurnService';
import { initializeWebSocket } from '../../services/websocketService';
import { Modal } from 'antd';
import API from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const { Content } = Layout;

const Multiplayer = ({ 
  currentPlayer,
  gameId,
  onGameEnd,
  socket,
  opponent
}) => {
  // Game state
  const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]);
  const [selectedDice, setSelectedDice] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [scores, setScores] = useState({});
  const [playerCategories, setPlayerCategories] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(true);

  // Opponent state
  const [opponentDice, setOpponentDice] = useState([1, 1, 1, 1, 1]);
  const [opponentCategories, setOpponentCategories] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    // Listen for opponent's moves
    socket.on('opponentRoll', ({ dice }) => {
      setOpponentDice(dice);
    });

    socket.on('opponentScore', ({ categories }) => {
      setOpponentCategories(categories);
    });

    socket.on('turnChange', ({ nextPlayer }) => {
      setIsMyTurn(nextPlayer === currentPlayer.player_id);
    });

    return () => {
      socket.off('opponentRoll');
      socket.off('opponentScore');
      socket.off('turnChange');
    };
  }, [socket, currentPlayer]);

  const handleDiceRoll = async () => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }

    await handleRollDice({
      rollCount,
      gameId,
      currentPlayer,
      diceValues,
      selectedDice,
      setIsRolling,
      setDiceValues,
      setScores,
      setRollCount
    });

    // Emit roll to opponent
    socket?.emit('diceRoll', {
      dice: diceValues,
      gameId
    });
  };

  useEffect(() => {
    if (!currentPlayer?.player_id) return;
  
    const connectSocket = async () => {
      try {
        const socketConnection = await initializeWebSocket(currentPlayer.player_id);
        setSocket(socketConnection);
  
        socketConnection.on('gameRequest', async ({ gameId, opponentId }) => {
          Modal.confirm({
            title: 'Game Invitation',
            content: 'You have been invited to a game. Do you accept?',
            onOk: async () => {
              try {
                await API.updateGame(gameId, 'active', 0);
                const opponentData = await API.getPlayerById(opponentId);
                setGameId(gameId);
                setOpponent(opponentData);
                message.success('Game started!');
              } catch (error) {
                console.error('Error accepting game request:', error);
                message.error('Failed to join game');
              }
            },
          });
        });
  
        socketConnection.on('gameStart', async ({ gameId, opponentId }) => {
          setGameId(gameId);
          const opponentData = await API.getPlayerById(opponentId);
          setOpponent(opponentData);
        });
  
        socketConnection.on('gameEnd', () => {
          message.info('Game ended');
          navigate('/lobby');
        });
      } catch (error) {
        console.error('WebSocket connection error:', error);
        message.error('Failed to connect to game server');
      }
    };
  
    connectSocket();
  
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentPlayer, navigate]);  

  const handleCategoryClick = async (categoryName) => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }

    try {
      // Calculate score for selected category
      const currentScores = calculateScores(diceValues);
      const score = currentScores[categoryName];

      // Emit score to opponent
      socket?.emit('scoreCategory', {
        gameId,
        categoryName,
        score
      });

      // End turn
      setRollCount(0);
      setSelectedDice([]);
      setDiceValues([1, 1, 1, 1, 1]);
      setIsMyTurn(false);

    } catch (error) {
      console.error('Error submitting score:', error);
      message.error('Failed to submit score');
    }
  };

  return (
    <Layout className="min-h-screen">
      <Content className="p-6">
        <div className="flex flex-col gap-6">
          {/* Player's Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4">
              {currentPlayer.name}'s Turn
            </h2>
            <div className="flex justify-center gap-4 mb-4">
              {diceValues.map((value, index) => (
                <Dice
                  key={index}
                  value={value}
                  isSelected={selectedDice.includes(index)}
                  onClick={() => toggleDiceSelection(
                    index,
                    isRolling,
                    !isMyTurn,
                    setSelectedDice
                  )}
                  isRolling={isRolling}
                />
              ))}
            </div>
            <Space className="w-full justify-center">
              <Button 
                type="primary"
                onClick={handleDiceRoll}
                disabled={rollCount >= 3 || !isMyTurn}
              >
                Roll Dice ({rollCount}/3)
              </Button>
            </Space>
          </div>

          {/* Opponent's Section */}
          {opponent && (
            <div className="bg-white p-4 rounded-lg shadow opacity-50">
              <h2 className="text-lg font-bold mb-4">
                {opponent.name}'s Dice
              </h2>
              <div className="flex justify-center gap-4 mb-4">
                {opponentDice.map((value, index) => (
                  <Dice
                    key={index}
                    value={value}
                    isSelected={false}
                    isRolling={false}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Scoreboards */}
          <div className="flex gap-6">
            <Scoreboard
              currentPlayer={currentPlayer}
              playerCategories={playerCategories}
              calculateScores={calculateScores}
              diceValues={diceValues}
              rollCount={rollCount}
              handleScoreCategoryClick={handleCategoryClick}
              onTurnComplete={() => {}}
              gameId={gameId}
            />
            {opponent && (
              <Scoreboard
                currentPlayer={opponent}
                playerCategories={opponentCategories}
                calculateScores={calculateScores}
                diceValues={opponentDice}
                rollCount={0}
                handleScoreCategoryClick={() => {}}
                onTurnComplete={() => {}}
                gameId={gameId}
                isOpponent
              />
            )}
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default Multiplayer;