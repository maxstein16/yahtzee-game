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
    const fetchGameDetails = async () => {
      try {
        const game = await API.getGameById(gameId);
        const players = await API.getPlayersInGame(gameId);

        // Set opponent details
        const opponentPlayer = players.find(p => p.player_id !== currentPlayer.player_id);
        setOpponent(opponentPlayer);

        // Initialize player categories
        await API.initializePlayerCategories(currentPlayer.player_id);
        const categories = await API.getPlayerCategories(currentPlayer.player_id);
        setPlayerCategories(categories);

        // Set default dice values first
        setDiceValues([1, 1, 1, 1, 1]);

        // Determine if it's the player's turn based on game state
        const isPlayerTurn = game.currentTurnPlayer === currentPlayer.player_id || 
                           game.status === 'pending' || 
                           !game.currentTurnPlayer;
        setIsMyTurn(isPlayerTurn);

        try {
          const gameDice = await API.getGameDice(gameId);
          if (gameDice && Array.isArray(gameDice.dice)) {
            setDiceValues(gameDice.dice);
          }
        } catch (diceError) {
          console.warn('Could not fetch dice state:', diceError);
        }

      } catch (error) {
        console.error('Error fetching game details:', error);
        message.error('Failed to load game details.');
      }
    };

    fetchGameDetails();

    // Initialize WebSocket
    const socketConnection = initializeWebSocket(currentPlayer.player_id);
    setSocket(socketConnection);

    socketConnection.on('chatMessage', (message) => {
      setChatMessages((prevMessages) => [...prevMessages, message]);
      scrollToBottom();
    });

    // Listen for turn changes
    socketConnection.on('turnChange', ({ nextPlayer }) => {
      setIsMyTurn(nextPlayer === currentPlayer.player_id);
      if (nextPlayer === currentPlayer.player_id) {
        message.info("It's your turn!");
        setRollCount(0);
        setDiceValues([1, 1, 1, 1, 1]);
      }
    });

    socketConnection.on('diceRolled', ({ dice, player }) => {
      if (player !== currentPlayer.player_id) {
        setDiceValues(dice);
      }
    });

    return () => socketConnection.disconnect();
  }, [gameId, currentPlayer]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleDiceSelection = (index) => {
    setSelectedDice((prevSelected) =>
      prevSelected.includes(index)
        ? prevSelected.filter((i) => i !== index)
        : [...prevSelected, index]
    );
  };

  const handleDiceRoll = async () => {
    if (rollCount >= 3 || !isMyTurn) return;

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
        
        // Emit the dice roll to other players
        if (socket) {
          socket.emit('diceRolled', {
            gameId,
            dice: result.dice,
            player: currentPlayer.player_id
          });
        }
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
      const category = playerCategories.find((cat) => cat.name === categoryName);
      if (!category) throw new Error('Invalid category.');
  
      // Get the current score for this category
      const currentScores = calculateScores(diceValues);
      const categoryScore = currentScores[categoryName];
      
      if (categoryScore === undefined) {
        throw new Error('Invalid score calculation');
      }
  
      // Update the category with the current score
      await API.updateScoreCategory(category.category_id, categoryScore);
      message.success('Score submitted successfully.');
  
      // Reload categories
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      setPlayerCategories(updatedCategories);
  
      // Notify turn completion
      await API.submitTurn(
        gameId, 
        currentPlayer.player_id, 
        category.category_id, 
        categoryScore, 
        diceValues, 
        rollCount
      );
      
      // Reset turn state
      setRollCount(0);
      setSelectedDice([]);
      setDiceValues([1, 1, 1, 1, 1]);
      setIsMyTurn(false);
  
      // Emit turn end
      if (socket) {
        socket.emit('turnEnd', {
          gameId,
          nextPlayer: opponent.player_id
        });
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      message.error('Failed to submit score.');
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