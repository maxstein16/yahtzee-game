import React, { useState } from 'react';
import {
  Layout,
  Typography,
  Button,
  Dropdown,
  Menu,
  Space,
  message,
} from 'antd';
import { DownOutlined } from '@ant-design/icons';
import '../styles/Lobby.css';
import '../styles/diceGame.css'; // Import dice styles for game
import Dice from '../components/Dice'; // Dice component (to display rolling dice)
import { rollDice } from '../services/diceService'; // API service to roll dice
import { calculateScores } from '../services/scoreboardService'; // Service for scoreboard calculations

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function Lobby() {
  const [mode, setMode] = useState('singleplayer');
  const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]); // Dice values
  const [selectedDice, setSelectedDice] = useState([]); // Tracks selected dice
  const [scores, setScores] = useState({});
  const [rollCount, setRollCount] = useState(0); // Roll count
  const [isRolling, setIsRolling] = useState(false); // Flag for rolling dice animation

  const rollDiceHandler = async () => {
    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    setIsRolling(true); // Start rolling animation
    setTimeout(async () => {
      try {
        const keepIndices = selectedDice; // Keep selected dice
        const result = await rollDice('12345', diceValues, keepIndices); // Replace '12345' with real game ID
        setDiceValues(result.dice); // Update dice with new values
        setScores(calculateScores(result.dice)); // Update scores dynamically
        setRollCount(result.rollCount); // Update roll count from API
      } catch (error) {
        message.error('Error rolling dice. Please try again.');
      } finally {
        setIsRolling(false); // Stop rolling animation
      }
    }, 1000);
  };

  const toggleDiceSelection = (index) => {
    setSelectedDice((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index) // Deselect dice
        : [...prev, index] // Select dice
    );
  };

  const handleScoreCategoryClick = (category) => {
    if (scores[category] === undefined) {
      message.warning('Select a dice combination first.');
      return;
    }

    setScores((prev) => ({
      ...prev,
      [category]: scores[category],
    }));

    setDiceValues([1, 1, 1, 1, 1]); // Reset dice for the next turn
    setSelectedDice([]);
    setRollCount(0);
    message.success(`${category} score saved!`);
  };

  const handleNewGame = (gameType) => {
    setMode(gameType);
    setDiceValues([1, 1, 1, 1, 1]); // Reset dice
    setSelectedDice([]); // Reset selected dice
    setScores({}); // Reset scores
    setRollCount(0); // Reset roll count
    message.success(`New ${gameType === 'singleplayer' ? 'Single Player' : 'Multiplayer'} game started!`);
  };

  const menu = (
    <Menu>
      <Menu.Item onClick={() => handleNewGame('singleplayer')}>New Single Player</Menu.Item>
      <Menu.Item onClick={() => handleNewGame('multiplayer')}>New Multiplayer</Menu.Item>
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
          <div className="player-name">{/* Display player name dynamically */}Current Player: Max</div>
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

      {/* Roll Dice Button Outside the Game Board */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Button
          type="primary"
          style={{ marginTop: '20px' }}
          onClick={rollDiceHandler}
        >
          Roll Dice
        </Button>
        <Text style={{ marginTop: '10px' }}>Roll Count: {rollCount}/3</Text>
      </div>
    </Layout>
  );
}

export default Lobby;
