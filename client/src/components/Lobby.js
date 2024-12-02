import React, { useState, useEffect } from 'react';
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
  const [aiPlayer, setAiPlayer] = useState({ name: 'AI Player', id: 'ai-player' });
  const [currentTurn, setCurrentTurn] = useState('player');
  const [players, setPlayers] = useState([]);
  const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]);
  const [aiDiceValues, setAiDiceValues] = useState([1, 1, 1, 1, 1]);
  const [selectedDice, setSelectedDice] = useState([]);
  const [scores, setScores] = useState({});
  const [aiScores, setAiScores] = useState({});
  const [rollCount, setRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

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
          if (mode === 'singleplayer') {
            setPlayers([currentPlayer, aiPlayer]);
          }
        } else {
          message.error(result.message);
        }
      };
      init();
    }
  }, [mode, currentPlayer]);

  useEffect(() => {
    if (mode === 'singleplayer' && currentTurn === 'ai' && !isRolling) {
      handleAiTurn();
    }
  }, [currentTurn, isRolling]);

  const handleAiTurn = async () => {
    if (rollCount < 3) {
      // AI logic for selecting dice and rolling
      const aiSelectedDice = calculateAiDiceSelection(aiDiceValues);
      await handleRollDice(true, aiSelectedDice);
    } else {
      // AI logic for choosing score category
      const bestCategory = calculateBestScoreCategory(aiDiceValues, aiScores);
      await handleScoreCategoryClick(bestCategory, true);
      setCurrentTurn('player');
    }
  };

  const calculateAiDiceSelection = (diceValues) => {
    // Simple AI logic: keep high numbers and matching dice
    const counts = {};
    diceValues.forEach((value, index) => {
      counts[value] = (counts[value] || 0) + 1;
    });

    return diceValues.map((value, index) => 
      value >= 4 || counts[value] >= 2 ? index : null
    ).filter(index => index !== null);
  };

  const calculateBestScoreCategory = (diceValues, scores) => {
    const possibleScores = calculateScores(diceValues);
    let bestCategory = null;
    let bestScore = -1;

    Object.entries(possibleScores).forEach(([category, score]) => {
      if (score > bestScore && !scores[category]) {
        bestScore = score;
        bestCategory = category;
      }
    });

    return bestCategory;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('playerId');
    navigate('/login');
  };

  const resetTurnState = () => {
    setDiceValues([1, 1, 1, 1, 1]);
    setAiDiceValues([1, 1, 1, 1, 1]);
    setSelectedDice([]);
    setRollCount(0);
    setScores({});
    setAiScores({});
  };

  const handleNewGame = (gameType) => {
    setMode(gameType);
    setCurrentTurn('player');
    resetTurnState();
  };

  const handleRollDice = async (isAi = false, aiSelected = []) => {
    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    setIsRolling(true);
    const result = await rollDice(
      gameId, 
      isAi ? aiPlayer : currentPlayer, 
      isAi ? aiDiceValues : diceValues, 
      isAi ? aiSelected : selectedDice
    );
    
    if (result.success) {
      if (isAi) {
        setAiDiceValues(result.dice);
        setAiScores(calculateScores(result.dice));
      } else {
        setDiceValues(result.dice);
        setScores(calculateScores(result.dice));
      }
      setRollCount(result.rollCount);
    } else {
      message.error(result.message);
    }
    
    setTimeout(() => setIsRolling(false), 1000);
  };

  const handleScoreCategoryClick = async (category, isAi = false) => {
    const currentScores = isAi ? aiScores : scores;
    if (!currentScores[category]) {
      message.warning('Select a valid dice combination.');
      return;
    }

    const result = await submitScore(
      gameId, 
      isAi ? aiPlayer.id : currentPlayer.player_id, 
      category, 
      currentScores[category]
    );

    if (result.success) {
      resetTurnState();
      setCurrentTurn(isAi ? 'player' : 'ai');
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
    <Layout className="layout-container">
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
          </Space>
          <Space>
            <span style={{ color: 'white' }}>
              {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
            </span>
            <Button onClick={handleLogout} type="primary" danger>Logout</Button>
          </Space>
        </Space>
      </Header>

      <Content className="content-layout">
        {mode === 'multiplayer' && (
          <div className="chat-sidebar">
            <Title level={4}>Game Chat</Title>
            {gameId && currentPlayer && (
              <Chat gameId={gameId} playerId={currentPlayer.player_id} />
            )}
          </div>
        )}

        <div className="game-board">
          <Title level={3}>Yahtzee</Title>
          
          <div className="players-section">
            <div className="opponent-area">
              <Title level={4}>
                {mode === 'singleplayer' ? 'AI Player' : 'Opponent'}
                {currentTurn === 'ai' && ' (Playing)'}
              </Title>
              {mode === 'singleplayer' && (
                <div className="game-dice-container">
                  {aiDiceValues.map((value, index) => (
                    <Dice
                      key={index}
                      value={value}
                      isSelected={false}
                      isRolling={isRolling && currentTurn === 'ai'}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div className="player-area">
              <div className="game-dice-container">
                {diceValues.map((value, index) => (
                  <Dice
                    key={index}
                    value={value}
                    isSelected={selectedDice.includes(index)}
                    isRolling={isRolling && currentTurn === 'player'}
                    onClick={() => toggleDiceSelection(index)}
                  />
                ))}
              </div>
              <div className="player-name">
                {currentPlayer?.name || 'Loading...'}
                {currentTurn === 'player' && ' (Playing)'}
              </div>
            </div>
          </div>

          <div className="roll-button-container">
            <Button
              type="primary"
              onClick={() => handleRollDice(false)}
              disabled={!gameId || rollCount >= 3 || currentTurn === 'ai'}
            >
              Roll Dice
            </Button>
            <Text className="roll-count">Roll Count: {rollCount}/3</Text>
          </div>
        </div>

        <div className="scoreboard">
          <Title level={4}>Scoreboard</Title>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>{mode === 'singleplayer' ? 'AI' : 'P2'}</th>
                <th>You</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(scores).map(([category, score]) => (
                <tr
                  key={category}
                  onClick={() => currentTurn === 'player' && handleScoreCategoryClick(category)}
                >
                  <td>{category}</td>
                  <td>{aiScores[category] || '-'}</td>
                  <td>{score || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Content>
    </Layout>
  );
}

export default Lobby;