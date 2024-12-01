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
import '../styles/Lobby.css';
import '../styles/diceGame.css';
import Dice from '../components/Dice';
import Chat from '../components/Chat';
import * as API from '../utils/api';
import initializeWebSocket from '../services/websocketService'; // Import WebSocket service

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

  // WebSocket reference
  const [socket, setSocket] = useState(null);

  // Fetch current player data and check authentication
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
        console.error('Error fetching player:', error);
        message.error('Session expired. Please login again');
        localStorage.removeItem('token');
        localStorage.removeItem('playerId');
        navigate('/login');
      }
    };

    fetchCurrentPlayer();
  }, [navigate]);

  // Initialize game when player data is loaded
  useEffect(() => {
    if (currentPlayer) {
      initializeGame();
    }
  }, [mode, currentPlayer]);

  // Initialize WebSocket for multiplayer mode
  useEffect(() => {
    if (mode === 'multiplayer' && gameId && currentPlayer) {
      initializeWebSocket(gameId, currentPlayer.player_id)
        .then((socketInstance) => {
          setSocket(socketInstance);

          // Listen for chat messages
          socketInstance.on('NEW_CHAT_MESSAGE', (message) => {
            console.log('New chat message:', message);
            // Handle incoming chat messages (optional)
          });

          // Handle game updates
          socketInstance.on('GAME_UPDATE', (update) => {
            console.log('Game update received:', update);
            // Handle game updates
          });
        })
        .catch((error) => {
          console.error('WebSocket initialization failed:', error);
        });

      // Clean up WebSocket on unmount or mode change
      return () => {
        if (socket) {
          socket.disconnect();
          setSocket(null);
        }
      };
    }
  }, [mode, gameId, currentPlayer]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('playerId');
    navigate('/login');
  };
  
  const initializeGame = async () => {
    if (!currentPlayer) return;

    try {
      const gameStatus = mode === 'singleplayer' ? 'pending' : 'waiting';
      const newGame = await API.createGame(gameStatus);
      setGameId(newGame.game_id);

      if (mode === 'multiplayer') {
        const gamePlayers = await API.getPlayersInGame(newGame.game_id);
        setPlayers(gamePlayers);
      }

      await API.startGame(newGame.game_id);
      message.success(`New ${mode} game created!`);
    } catch (error) {
      message.error(`Failed to create game: ${error.message}`);
    }
  };

  const rollDiceHandler = async () => {
    if (!gameId || !currentPlayer) {
      message.warning('Game not initialized or no player.');
      return;
    }

    if (rollCount >= 3) {
      message.warning('Maximum rolls reached for this turn.');
      return;
    }

    setIsRolling(true);
    try {
      const result = await API.rollDice(
        gameId, 
        diceValues, 
        selectedDice
      );
      
      setDiceValues(result.dice);
      setScores(calculateScores(result.dice));
      setRollCount(result.rollCount);
    } catch (error) {
      message.error(`Dice roll failed: ${error.message}`);
    } finally {
      setIsRolling(false);
    }
  };

  const handleScoreCategoryClick = async (category) => {
    if (!gameId || !currentPlayer) {
      message.warning('Game or player not set.');
      return;
    }

    if (!scores[category]) {
      message.warning('Select a valid dice combination.');
      return;
    }

    try {
      await API.submitTurn(
        gameId, 
        currentPlayer.player_id, 
        category, 
        scores[category]
      );
      
      resetTurnState();
      message.success(`${category} score saved!`);
    } catch (error) {
      message.error(`Turn submission failed: ${error.message}`);
    }
  };

  const resetTurnState = () => {
    setDiceValues([1, 1, 1, 1, 1]);
    setSelectedDice([]);
    setRollCount(0);
    setScores({});
  };

  const toggleDiceSelection = (index) => {
    setSelectedDice((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const handleNewGame = (gameType) => {
    setMode(gameType);
    resetTurnState();
  };

  const calculateScores = (dice) => {
    const counts = dice.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});

    const sum = dice.reduce((a, b) => a + b, 0);
    const scores = {
      ones: dice.filter(d => d === 1).reduce((a, b) => a + b, 0),
      twos: dice.filter(d => d === 2).reduce((a, b) => a + b, 0),
      threes: dice.filter(d => d === 3).reduce((a, b) => a + b, 0),
      fours: dice.filter(d => d === 4).reduce((a, b) => a + b, 0),
      fives: dice.filter(d => d === 5).reduce((a, b) => a + b, 0),
      sixes: dice.filter(d => d === 6).reduce((a, b) => a + b, 0),
      threeOfAKind: Object.values(counts).some(count => count >= 3) ? sum : 0,
      fourOfAKind: Object.values(counts).some(count => count >= 4) ? sum : 0,
      fullHouse: Object.values(counts).some(count => count === 3) && 
                Object.values(counts).some(count => count === 2) ? 25 : 0,
      smallStraight: [1,2,3,4].every(val => dice.includes(val)) || 
                     [2,3,4,5].every(val => dice.includes(val)) || 
                     [3,4,5,6].every(val => dice.includes(val)) ? 30 : 0,
      largeStraight: [1,2,3,4,5].every(val => dice.includes(val)) || 
                     [2,3,4,5,6].every(val => dice.includes(val)) ? 40 : 0,
      yahtzee: Object.values(counts).some(count => count === 5) ? 50 : 0,
      chance: sum
    };

    return scores;
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
      <Header className="top-nav" style={{ background: '#FF4500', padding: '0 20px' }}>
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
              <Button onClick={() => setIsChatVisible(true)}>
                Chat
              </Button>
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

      <Content style={{ display: 'flex', padding: '20px', justifyContent: 'space-between' }}>
        <div className="game-board" style={{
          border: '2px solid #000',
          width: '80%',
          height: '500px',
          padding: '10px',
          textAlign: 'center',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
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

        <div className="scoreboard" style={{
          border: '2px solid #000',
          width: '30%',
          padding: '10px',
          background: '#f9f9f9',
        }}>
          <Title level={4}>Scoreboard</Title>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '5px' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '5px' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(scores).map(([category, score]) => (
                <tr
                  key={category}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleScoreCategoryClick(category)}
                >
                  <td style={{ padding: '5px', textTransform: 'capitalize' }}>
                    {category}
                  </td>
                  <td style={{ padding: '5px', textAlign: 'right' }}>
                    {score || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Content>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Button
          type="primary"
          style={{ marginTop: '20px' }}
          onClick={rollDiceHandler}
          disabled={!gameId || rollCount >= 3}
        >
          Roll Dice
        </Button>
        <Text style={{ marginLeft: '10px' }}>
          Roll Count: {rollCount}/3
        </Text>
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