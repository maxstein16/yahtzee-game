import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Button,
  Dropdown,
  Menu,
  Space,
  message,
  Modal,
} from 'antd';
import { DownOutlined } from '@ant-design/icons';
import '../styles/Lobby.css';
import '../styles/diceGame.css';
import Dice from '../components/Dice';
import ChatComponent from '../components/ChatComponent';
import * as API from '../utils/api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function Lobby() {
  const [mode, setMode] = useState('singleplayer');
  const [gameId, setGameId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]);
  const [selectedDice, setSelectedDice] = useState([]);
  const [scores, setScores] = useState({});
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);

  useEffect(() => {
    // Initialize game when component mounts or mode changes
    initializeGame();
  }, [mode]);

  const initializeGame = async () => {
    try {
      // Determine if single or multiplayer
      const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
      
      // Create a new game
      const newGame = await API.createGame(gameStatus);
      setGameId(newGame.game_id);

      // If multiplayer, you might want to add a player invitation logic here
      if (mode === 'multiplayer') {
        // Optional: Open a modal to invite players or join a game
        message.info('Waiting for other players to join...');
      }
    } catch (error) {
      message.error('Failed to create game: ' + error.message);
    }
  };

  const rollDiceHandler = async () => {
    if (!gameId) {
      message.warning('Game not initialized.');
      return;
    }

    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    setIsRolling(true);
    try {
      const keepIndices = selectedDice;
      const result = await API.rollDice(gameId, diceValues, keepIndices);
      
      setDiceValues(result.dice);
      // Note: You'll need to implement calculateScores separately
      setScores(calculateScores(result.dice));
      setRollCount(result.rollCount);
    } catch (error) {
      message.error('Error rolling dice: ' + error.message);
    } finally {
      setIsRolling(false);
    }
  };

  const handleScoreCategoryClick = async (category) => {
    if (!gameId || !currentPlayer) {
      message.warning('Game or player not set.');
      return;
    }

    if (scores[category] === undefined) {
      message.warning('Select a dice combination first.');
      return;
    }

    try {
      // Submit turn to the backend
      await API.submitTurn(gameId, currentPlayer.player_id, category, scores[category]);
      
      // Reset game state
      setDiceValues([1, 1, 1, 1, 1]);
      setSelectedDice([]);
      setRollCount(0);
      message.success(`${category} score saved!`);
    } catch (error) {
      message.error('Failed to submit turn: ' + error.message);
    }
  };

  const toggleDiceSelection = (index) => {
    setSelectedDice((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const handleNewGame = async (gameType) => {
    setMode(gameType);
    // Game initialization is now handled in useEffect
    
    // Reset all game states
    setDiceValues([1, 1, 1, 1, 1]);
    setSelectedDice([]);
    setScores({});
    setRollCount(0);
    
    message.success(`New ${gameType === 'singleplayer' ? 'Single Player' : 'Multiplayer'} game started!`);
  };

  const calculateScores = (dice) => {
    // Implement scoring logic
    // This is a placeholder - you'll need to create actual scoring rules
    return {};
  };

  const menu = (
    <Menu>
      <Menu.Item onClick={() => handleNewGame('singleplayer')}>
        New Single Player
      </Menu.Item>
      <Menu.Item onClick={() => handleNewGame('multiplayer')}>
        New Multiplayer
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ height: '100vh' }}>
      {/* Top Navigation */}
      <Header className="top-nav" style={{ background: '#FF4500', padding: '0 20px' }}>
        <Space>
          <Dropdown overlay={menu} trigger={['click']}>
            <Button>
              New Game <DownOutlined />
            </Button>
          </Dropdown>
          <Button
            type={mode === 'singleplayer' ? 'primary' : 'default'}
            onClick={() => handleNewGame('singleplayer')}
          >
            Single Player
          </Button>
          <Button
            type={mode === 'multiplayer' ? 'primary' : 'default'}
            onClick={() => handleNewGame('multiplayer')}
          >
            Multiplayer
          </Button>
          {mode === 'multiplayer' && (
            <Button onClick={() => setIsChatVisible(true)}>
              Chat
            </Button>
          )}
        </Space>
      </Header>

      {/* Main Content */}
      <Content style={{ display: 'flex', padding: '20px', justifyContent: 'space-between' }}>
        {/* Game Board */}
        <div
          className="game-board"
          style={{
            border: '2px solid #000',
            width: '80%',
            height: '500px',
            padding: '10px',
            textAlign: 'center',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Title level={3} className="game-board-title">Game Board</Title>
          <div className="game-dice-container">
            {diceValues.map((value, index) => (
              <Dice
                key={index}
                value={value}
                isSelected={selectedDice.includes(index)}
                isRolling={isRolling}
                onClick={() => toggleDiceSelection(index)}
              />
            ))}
          </div>
          <div className="player-name">
            Current Player: {currentPlayer ? currentPlayer.name : 'Not assigned'}
          </div>
        </div>

        {/* Scoreboard */}
        <div
          className="scoreboard"
          style={{
            border: '2px solid #000',
            width: '30%',
            padding: '10px',
            background: '#f9f9f9',
          }}
        >
          <Title level={4}>Scoreboard</Title>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ccc' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '5px', borderBottom: '1px solid #ccc' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(scores).map(([category, score]) => (
                <tr
                  key={category}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleScoreCategoryClick(category)}
                >
                  <td style={{ padding: '5px', textTransform: 'capitalize' }}>{category}</td>
                  <td style={{ padding: '5px', textAlign: 'right' }}>{score || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Content>

      {/* Roll Dice Button */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Button
          type="primary"
          style={{ marginTop: '20px' }}
          onClick={rollDiceHandler}
          disabled={!gameId}
        >
          Roll Dice
        </Button>
        <Text style={{ marginTop: '10px' }}>Roll Count: {rollCount}/3</Text>
      </div>

      {/* Chat Modal for Multiplayer */}
      <Modal
        title="Game Chat"
        visible={isChatVisible && mode === 'multiplayer'}
        onCancel={() => setIsChatVisible(false)}
        footer={null}
        width={400}
      >
        <ChatComponent gameId={gameId} />
      </Modal>
    </Layout>
  );
}

export default Lobby;