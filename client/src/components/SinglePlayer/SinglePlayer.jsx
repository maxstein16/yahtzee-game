import React, { useState, useEffect } from 'react';
import { Layout, Space, Button, message } from 'antd';
import Dice from '../../pages/Dice';
import Scoreboard from '../Scoreboard/ScoreBoard';
import { handleRollDice, toggleDiceSelection } from '../../services/diceService';
import { calculateScores } from '../../services/scoreTurnService';
import { calculateOptimalMove } from '../../services/opponentService';

const { Content } = Layout;

const Singleplayer = ({ 
  currentPlayer,
  gameId,
  onGameEnd 
}) => {
  // Player state
  const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]);
  const [selectedDice, setSelectedDice] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [scores, setScores] = useState({});
  const [playerCategories, setPlayerCategories] = useState([]);

  // AI state
  const [aiDiceValues, setAiDiceValues] = useState([1, 1, 1, 1, 1]);
  const [aiCategories, setAiCategories] = useState([]);
  const [isAiTurn, setIsAiTurn] = useState(false);
  const [aiRollCount, setAiRollCount] = useState(0);

  const handleDiceRoll = async () => {
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
  };

  const handleCategoryClick = async (categoryName) => {
    if (isAiTurn) {
      message.warning("It's the AI's turn!");
      return;
    }

    try {
      // Calculate score for selected category
      const currentScores = calculateScores(diceValues);
      const score = currentScores[categoryName];

      // Reset turn state
      setRollCount(0);
      setSelectedDice([]);
      setDiceValues([1, 1, 1, 1, 1]);

      // Start AI turn
      setIsAiTurn(true);
      await executeAiTurn();

    } catch (error) {
      console.error('Error submitting score:', error);
      message.error('Failed to submit score');
    }
  };

  const executeAiTurn = async () => {
    try {
      setAiRollCount(1);
      
      // Initial roll
      let newDice = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
      setAiDiceValues(newDice);
      
      // Get available categories
      const availableCategories = aiCategories.filter(cat => !cat.is_submitted);
      
      // Calculate optimal move
      const optimalMove = calculateOptimalMove(newDice, availableCategories, calculateScores);
      
      // Perform additional rolls if needed
      for (let roll = 2; roll <= 3; roll++) {
        if (optimalMove.expectedScore < 20) { // Threshold for rerolling
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          newDice = newDice.map((value, index) => 
            optimalMove.keepIndices.includes(index) ? value : Math.floor(Math.random() * 6) + 1
          );
          
          setAiDiceValues(newDice);
          setAiRollCount(roll);
        } else {
          break;
        }
      }

      // Submit score
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset AI turn
      setAiDiceValues([1, 1, 1, 1, 1]);
      setAiRollCount(0);
      setIsAiTurn(false);

    } catch (error) {
      console.error('Error during AI turn:', error);
      message.error('AI turn failed');
      setIsAiTurn(false);
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
                    isAiTurn,
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
                disabled={rollCount >= 3 || isAiTurn}
              >
                Roll Dice ({rollCount}/3)
              </Button>
            </Space>
          </div>

          {/* AI Section */}
          <div className="bg-white p-4 rounded-lg shadow opacity-50">
            <h2 className="text-lg font-bold mb-4">
              AI's Dice
            </h2>
            <div className="flex justify-center gap-4 mb-4">
              {aiDiceValues.map((value, index) => (
                <Dice
                  key={index}
                  value={value}
                  isSelected={false}
                  isRolling={false}
                  onClick={() => {}}
                />
              ))}
            </div>
            {isAiTurn && (
              <div className="text-center text-gray-600">
                AI is thinking... (Roll {aiRollCount}/3)
              </div>
            )}
          </div>

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
            <Scoreboard
              currentPlayer={{ name: 'AI', player_id: 'ai' }}
              playerCategories={aiCategories}
              calculateScores={calculateScores}
              diceValues={aiDiceValues}
              rollCount={0}
              handleScoreCategoryClick={() => {}}
              onTurnComplete={() => {}}
              gameId={gameId}
              isOpponent
            />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default Singleplayer;