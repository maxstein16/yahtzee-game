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
import { playAITurn } from '../services/aiOpponentService';
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
  const [aiDiceValues, setAiDiceValues] = useState([1, 1, 1, 1, 1]);
  const [selectedDice, setSelectedDice] = useState([]);
  const [scores, setScores] = useState({});
  const [rollCount, setRollCount] = useState(0);
  const [aiRollCount, setAiRollCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isAITurn, setIsAITurn] = useState(false);
  const [aiPlayer, setAiPlayer] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);

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
            setAiPlayer({
              player_id: 'ai-opponent',
              name: 'AI Opponent',
              scores: {}
            });
          } else {
            setAiPlayer(null);
          }
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
    setGameHistory([]);
    setAiDiceValues([1, 1, 1, 1, 1]);
    setAiRollCount(0);
    setIsAITurn(false);
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
      
      if (mode === 'singleplayer' && aiPlayer) {
        setIsAITurn(true);
        try {
          // Simulate AI rolls with animation
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const rollResult = await rollDice(gameId, aiPlayer, aiDiceValues, []);
            if (rollResult.success) {
              setAiDiceValues(rollResult.dice);
              setAiRollCount(i + 1);
            }
          }
          
          // Calculate best score and submit
          const scores = calculateScores(aiDiceValues);
          const { category: bestCategory, score: bestScore } = await playAITurn(gameId, aiPlayer);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          const aiResult = await submitScore(gameId, aiPlayer, bestCategory, bestScore);
          
          if (aiResult.success) {
            message.success(`AI played ${bestCategory} for ${bestScore} points!`);
            setGameHistory(prev => [...prev, {
              player: 'AI Opponent',
              category: bestCategory,
              score: bestScore,
              timestamp: new Date().toISOString()
            }]);
          }
        } catch (error) {
          message.error('AI turn failed: ' + error.message);
        } finally {
          setIsAITurn(false);
          setAiDiceValues([1, 1, 1, 1, 1]);
          setAiRollCount(0);
        }
      }
    } else {
      message.error(result.message);
    }
  };

  const toggleDiceSelection = (index) => {
    if (isRolling || isAITurn) return;
    
    setSelectedDice((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const menu = (
    <Menu>
      <Menu.Item key="single" onClick={() => handleNewGame('singleplayer')}>
        New Single Player
      </Menu.Item>
      <Menu.Item key="multi" onClick={() => handleNewGame('multiplayer')}>
        New Multiplayer
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ height: '100vh' }}>
      <Header className="top-nav">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
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
              <Button onClick={() => setIsChatVisible(true)}>Chat</Button>
            )}
          </Space>
          <Space>
            <span style={{ color: 'white' }}>
              {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
            </span>
            <Button onClick={handleLogout} type="primary" danger>
              Logout
            </Button>
          </Space>
        </Space>
      </Header>

      <Content className="game-container">
        <div className="game-board">
          <div className="opponent-section">
            <Title level={4}>AI Opponent</Title>
            {isAITurn && (
              <>
                <div className="game-dice-container">
                  {aiDiceValues.map((value, index) => (
                    <Dice
                      key={index}
                      value={value}
                      isRolling={isRolling}
                      disabled={true}
                    />
                  ))}
                </div>
                <Text>Roll Count: {aiRollCount}/3</Text>
              </>
            )}
          </div>
          
          <div className="player-section">
            <Title level={4}>{currentPlayer?.name || 'Player'}</Title>
            <div className="game-dice-container">
              {!isAITurn && diceValues.map((value, index) => (
                <Dice
                  key={index}
                  value={value}
                  isSelected={selectedDice.includes(index)}
                  isRolling={isRolling}
                  onClick={() => toggleDiceSelection(index)}
                  disabled={isAITurn || rollCount >= 3}
                />
              ))}
            </div>
            <div className="roll-button-container">
              <Button
                type="primary"
                onClick={handleRollDice}
                disabled={!gameId || rollCount >= 3 || isAITurn}
              >
                Roll Dice
              </Button>
              <Text className="roll-count">Roll Count: {rollCount}/3</Text>
            </div>
          </div>
        </div>

        <div className="scoreboard">
          <Title level={4}>Scoreboard</Title>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>{currentPlayer?.name || 'Player'}</th>
                {mode === 'singleplayer' && <th>AI</th>}
              </tr>
            </thead>
            <tbody>
              {Object.entries(scores).map(([category, score]) => (
                <tr
                  key={category}
                  onClick={() => !isAITurn && rollCount > 0 && handleScoreCategoryClick(category)}
                  className={(!isAITurn && rollCount > 0) ? 'clickable' : 'disabled'}
                >
                  <td style={{ textTransform: 'capitalize' }}>{category}</td>
                  <td>{score || '-'}</td>
                  {mode === 'singleplayer' && (
                    <td>
                      {gameHistory
                        .filter(h => h.player === 'AI Opponent' && h.category === category)
                        .map(h => h.score)[0] || '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Content>

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