// src/pages/Lobby/Lobby.jsx
import React from 'react';
import { Layout, Typography, Button, Space, Menu, Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import Dice from '../../components/Dice';
import Chat from '../../components/Chat';
import '../../styles/Lobby.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LobbyView = ({
  // Game props
  mode,
  currentPlayer,
  gameId,
  
  // Player props
  diceValues,
  selectedDice,
  isRolling,
  rollCount,
  playerTotal,
  playerCategories,
  
  // AI props
  aiDiceValues,
  aiRollCount,
  isAITurn,
  aiTotal,
  aiCategories,
  
  // UI props
  isChatVisible,
  
  // Action handlers
  handleNewGame,
  handleLogout,
  handleRollDice,
  toggleDiceSelection,
  handleScoreCategoryClick,
  setIsChatVisible,
  calculateScores
}) => {
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
            <Title level={4}>AI Opponent (Total: {aiTotal})</Title>
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
            <Title level={4}>{currentPlayer?.name || 'Player'} (Total: {playerTotal})</Title>
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
              {playerCategories.map((category) => {
                const currentScore = calculateScores(diceValues)[category.name];
                return (
                  <tr
                    key={category.category_id}
                    onClick={() => !isAITurn && rollCount > 0 && !category.score && handleScoreCategoryClick(category.name)}
                    className={(!isAITurn && rollCount > 0 && !category.score) ? 'clickable' : 'disabled'}
                  >
                    <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                    <td>{category.score || (rollCount > 0 ? currentScore : '-')}</td>
                    {mode === 'singleplayer' && (
                      <td>
                        {aiCategories.find(c => c.name === category.name)?.score || '-'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Content>

      {isChatVisible && mode === 'multiplayer' && (
        <Chat 
          gameId={gameId} 
          playerId={currentPlayer?.player_id}
          onClose={() => setIsChatVisible(false)}
        />
      )}
    </Layout>
  );
};

export default LobbyView;