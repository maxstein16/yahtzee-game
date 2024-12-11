import React, { useState, useEffect, useRef } from 'react';
import { Card, Typography, Input, Button, List, Avatar, message, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import GameBoard from '../../components/GameBoard/GameBoard';
import Scoreboard from '../../components/ScoreBoard/ScoreBoard';
import API from '../../utils/api';
import { initializeWebSocket } from '../../services/websocketService';

const { Title } = Typography;
const { TextArea } = Input;

const Game = ({ gameId, currentPlayer }) => {
  const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]);
  const [rollCount, setRollCount] = useState(0);
  const [selectedDice, setSelectedDice] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [playerCategories, setPlayerCategories] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [opponent, setOpponent] = useState(null);
  const messagesEndRef = useRef(null);
  const [socket, setSocket] = useState(null);


  useEffect(() => {
    const initializeGame = async () => {
      try {
        const turn = await API.getTurn(gameId, currentPlayer.player_id);
    
        if (turn && !turn.turn_completed) {
          setDiceValues(turn.dice || [1, 1, 1, 1, 1]);
          setRollCount(turn.rerolls || 0);
          setIsMyTurn(turn.player_id === currentPlayer.player_id);
        } else {
          setIsMyTurn(false);
          message.info("Waiting for opponent's turn...");
        }
      } catch (error) {
        console.error('Error initializing game:', error.message);
        message.error('Failed to initialize game.');
      }
    };    
  
    initializeGame();
  
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [gameId, currentPlayer]);
  

  const toggleDiceSelection = (index) => {
    setSelectedDice((prevSelected) =>
      prevSelected.includes(index)
        ? prevSelected.filter((i) => i !== index)
        : [...prevSelected, index]
    );
  };

  const handleDiceRoll = async () => {
    if (!isMyTurn) {
      message.warning("It's not your turn!");
      return;
    }
  
    if (rollCount >= 3) {
      message.warning("You've used all your rolls! Please select a category to score.");
      return;
    }
  
    try {
      setIsRolling(true);
      const result = await API.rollDice(gameId, {
        playerId: currentPlayer.player_id,
        currentDice: diceValues,
        keepIndices: selectedDice,
      });
  
      if (result.success) {
        setDiceValues(result.dice);
        setRollCount(prev => prev + 1);
        setSelectedDice([]);
  
        // Emit dice roll to other players
        if (socket) {
          socket.emit('diceRolled', {
            gameId,
            dice: result.dice,
            player: currentPlayer.player_id,
          });
        }
  
        // Update turn
        await API.updateTurn(
          gameId,
          currentPlayer.player_id,
          result.dice,
          rollCount + 1,
          0,
          false
        );
      }
    } catch (error) {
      console.error('Error rolling dice:', error);
      message.error('Failed to roll dice.');
    } finally {
      setIsRolling(false);
    }
  };  

  const handleScoreCategoryClick = async (categoryName) => {
    try {
      if (!isMyTurn) {
        message.warning("It's not your turn!");
        return;
      }
  
      const category = playerCategories.find((cat) => cat.name === categoryName);
      if (!category) throw new Error('Invalid category.');
  
      const currentScores = calculateScores(diceValues);
      const categoryScore = Number(currentScores[categoryName]);
  
      if (categoryScore === undefined || isNaN(categoryScore)) {
        throw new Error('Invalid score calculation');
      }
  
      await API.updateScoreCategory(category.category_id, categoryScore);
  
      await API.submitTurn(
        gameId,
        currentPlayer.player_id,
        category.category_id,
        categoryScore,
        diceValues,
        rollCount
      );
  
      await API.updateTurn(gameId, currentPlayer.player_id, diceValues, rollCount, categoryScore, true);
  
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      setPlayerCategories(updatedCategories);
  
      setRollCount(0);
      setSelectedDice([]);
      setDiceValues([1, 1, 1, 1, 1]);
      setIsMyTurn(false);
  
      if (socket) {
        socket.emit('turnEnd', {
          gameId,
          nextPlayer: opponent.player_id,
        });
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      message.error(error.message || 'Failed to submit score.');
    }
  };  

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    try {
      await API.sendMessage(gameId, currentPlayer.player_id, chatInput.trim());
      setChatInput('');
    } catch (error) {
      console.error('Error sending chat message:', error);
      message.error('Failed to send message.');
    }
  };

  const calculateScores = (diceValues) => {
    const counts = Array(7).fill(0); // Counts for dice values 1-6
    diceValues.forEach((value) => counts[value]++);
  
    const isStraight = (array, length) => {
      let consecutive = 0;
      for (let i = 1; i <= 6; i++) {
        if (array[i] > 0) consecutive++;
        else consecutive = 0;
        if (consecutive >= length) return true;
      }
      return false;
    };
  
    const scores = {
      ones: counts[1] * 1,
      twos: counts[2] * 2,
      threes: counts[3] * 3,
      fours: counts[4] * 4,
      fives: counts[5] * 5,
      sixes: counts[6] * 6,
      threeOfAKind: Object.values(counts).some((count) => count >= 3)
        ? diceValues.reduce((sum, val) => sum + val, 0)
        : 0,
      fourOfAKind: Object.values(counts).some((count) => count >= 4)
        ? diceValues.reduce((sum, val) => sum + val, 0)
        : 0,
      fullHouse: Object.values(counts).includes(3) && Object.values(counts).includes(2) ? 25 : 0,
      smallStraight: isStraight(counts, 4) ? 30 : 0,
      largeStraight: isStraight(counts, 5) ? 40 : 0,
      yahtzee: Object.values(counts).includes(5) ? 50 : 0,
      chance: diceValues.reduce((sum, val) => sum + val, 0),
    };
  
    return scores;
  };  

  return (
    <div className="game-container">
      <Title level={3}>Yahtzee Game</Title>
      <GameBoard
        currentPlayer={currentPlayer}
        diceValues={diceValues}
        selectedDice={selectedDice}
        isRolling={isRolling}
        rollCount={rollCount}
        toggleDiceSelection={toggleDiceSelection}
        handleDiceRoll={handleDiceRoll}
        isMyTurn={isMyTurn}
        gameId={gameId}
      />
      <div className="flex gap-8">
        <Scoreboard
          currentPlayer={currentPlayer}
          playerCategories={playerCategories}
          calculateScores={calculateScores}
          diceValues={diceValues}
          rollCount={rollCount}
          handleScoreCategoryClick={handleScoreCategoryClick}
          gameId={gameId}
        />
        {opponent && (
          <Scoreboard
            currentPlayer={opponent}
            playerCategories={playerCategories}
            isOpponent
            gameId={gameId}
          />
        )}
      </div>
      <Card title="Game Chat">
        <List
          dataSource={chatMessages}
          renderItem={(msg, index) => (
            <List.Item key={index}>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={msg.sender}
                description={msg.content}
              />
            </List.Item>
          )}
        />
        <div ref={messagesEndRef} />
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your message..."
            autoSize={{ minRows: 1, maxRows: 4 }}
          />
          <Button type="primary" onClick={handleSendMessage}>
            Send
          </Button>
        </Space.Compact>
      </Card>
    </div>
  );
};

export default Game;