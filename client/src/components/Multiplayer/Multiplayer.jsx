import React, { useState, useEffect } from 'react';
import { Layout, Space, Button, message } from 'antd';
import Dice from '../../pages/Dice';
import Scoreboard from '../ScoreBoard/ScoreBoard';
import { toggleDiceSelection } from '../../services/diceService';
import { calculateScores } from '../../services/scoreTurnService';
import API from '../../utils/api';

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

    socket.on('gameStart', ({ gameId, opponentId }) => {
      setGameId(gameId);
      setOpponent(connectedPlayers.get(opponentId));
    });

    return () => {
      socket.off('opponentRoll');
      socket.off('opponentScore');
      socket.off('turnChange');
      socket.off('gameStart');
    };
  }, [socket, currentPlayer, connectedPlayers]);

  const handleDiceRoll = async () => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }

    try {
      const { dice, rerolls } = await API.rollDice(gameId, {
        playerId: currentPlayer.player_id,
        currentDice: diceValues,
        keepIndices: selectedDice
      });
      setDiceValues(dice);
      setRollCount(rerolls);
      setIsRolling(true);

      // Emit roll to opponent
      socket?.emit('diceRoll', {
        dice,
        gameId
      });
    } catch (error) {
      console.error('Error rolling dice:', error);
      message.error('Failed to roll dice');
    }
  };

  const handleCategoryClick = async (categoryName) => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }

    try {
      // Calculate score for selected category
      const currentScores = calculateScores(diceValues);
      const score = currentScores[categoryName];

      // Submit score to the server
      await API.submitTurn(gameId, currentPlayer.player_id, categoryName, score, diceValues, rollCount);

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