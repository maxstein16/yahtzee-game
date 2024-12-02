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
import { useNavigate } from 'react-router-dom';
import { initializeGame, rollDice, submitScore, calculateScores } from '../services/lobbyService';
import '../styles/Lobby.css';
import Dice from '../components/Dice';
import Chat from '../components/Chat';
import * as API from '../utils/api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function Lobby() {
  const navigate = useNavigate();
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
    const fetchCurrentPlayer = async () => {
      try {
        const token = localStorage.getItem('token');
        const playerId = localStorage.getItem('playerId');
        
        if (!token || !playerId) {
          navigate('/login');
          return;
        }

        const playerData = await API.getPlayerById(playerId);
        setCurrentPlayer(playerData);
      } catch (error) {
        message.error('Session expired. Please login again');
        localStorage.removeItem('token');
        localStorage.removeItem('playerId');
        navigate('/login');
      }
    };

    fetchCurrentPlayer();
  }, [navigate]);

  useEffect(() => {
    if (currentPlayer) {
      const init = async () => {
        const result = await initializeGame(currentPlayer, mode, setGameId, setPlayers);
        if (result.success) {
          message.success(result.message);
        } else {
          message.error(result.message);
        }
      };
      init();
    }
  }, [mode, currentPlayer]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('playerId');
    navigate('/login');
  };

  const resetTurnState = () => {
    setDiceValues([1, 1, 1, 1, 1]);
    setSelectedDice([]);
    setRollCount(0);
    setScores({});
  };

  const handleNewGame = (gameType) => {
    setMode(gameType);
    resetTurnState();
  };

  const handleRollDice = async () => {
    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    setIsRolling(true);
    const result = await rollDice(gameId, currentPlayer, diceValues, selectedDice);
    
    if (result.success) {
      setDiceValues(result.dice);
      setScores(calculateScores(result.dice));
      setRollCount(result.rollCount);
    } else {
      message.error(result.message);
    }
    setIsRolling(false);
  };

  const handleScoreCategoryClick = async (category) => {
    if (!scores[category]) {
      message.warning('Select a valid dice combination.');
      return;
    }

    const result = await submitScore(gameId, currentPlayer, category, scores[category]);
    if (result.success) {
      resetTurnState();
      message.success(result.message);
    } else {
      message.error(result.message);
    }
  };

  const toggleDiceSelection = (index) => {
    setSelectedDice((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const menu = (
    <Menu>
      <Menu.Item onClick={() => handleNewGame('singleplayer')}>New Single Player</Menu.Item>
      <Menu.Item onClick={() => handleNewGame('multiplayer')}>New Multiplayer</Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ height: '100vh' }}>
      <Header className="top-nav">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Dropdown overlay={menu} trigger={['click']}>
              <Button>New Game <DownOutlined /></Button>
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
              <Button onClick={() => setIsChatVisible(true)}>Chat</Button>
            )}
          </Space>
          <Space>
            <span style={{ color: 'white' }}>
              {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
            </span>
            <Button onClick={handleLogout} type="primary" danger>Logout</Button>
          </Space>
        </Space>
      </Header>

      <Content style={{ display: 'flex', padding: '20px', justifyContent: 'space-between' }}>
        <div className="game-board">
          <Title level={3}>Game Board</Title>
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
            Current Player: {currentPlayer?.name || 'Loading...'}
          </div>
        </div>

        <div className="scoreboard">
          <Title level={4}>Scoreboard</Title>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(scores).map(([category, score]) => (
                <tr
                  key={category}
                  onClick={() => handleScoreCategoryClick(category)}
                >
                  <td style={{ textTransform: 'capitalize' }}>{category}</td>
                  <td>{score || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Content>

      <div className="roll-button-container">
        <Button
          type="primary"
          onClick={handleRollDice}
          disabled={!gameId || rollCount >= 3}
        >
          Roll Dice
        </Button>
        <Text className="roll-count">Roll Count: {rollCount}/3</Text>
      </div>

      <Modal
        title="Game Chat"
        visible={isChatVisible && mode === 'multiplayer'}
        onCancel={() => setIsChatVisible(false)}
        footer={null}
        width={400}
      >
        {gameId && currentPlayer && (
          <Chat 
            gameId={gameId} 
            playerId={currentPlayer.player_id} 
          />
        )}
      </Modal>
    </Layout>
  );
}

export default Lobby;