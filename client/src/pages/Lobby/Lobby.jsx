import React from 'react';
import { Layout, Typography, Button, Space } from 'antd';
import Scoreboard from '../../components/ScoreBoard/ScoreBoard';
import Dice from '../../pages/Dice';
import '../../styles/Lobby.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LobbyView = ({
  currentPlayer,
  gameId,
  diceValues,
  selectedDice,
  isRolling,
  rollCount,
  playerTotal,
  playerCategories,
  handleNewGame,
  handleLogout,
  handleRollDice,
  toggleDiceSelection,
  handleScoreCategoryClick,
  calculateScores,
  onTurnComplete
}) => {
  return (
    <Layout style={{ height: '100vh' }}>
      <Header className="top-nav">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={handleNewGame}>New Game</Button>
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
          <div className="player-section">
            <Title level={4}>{currentPlayer?.name || 'Player'} (Total: {playerTotal})</Title>
            <div className="game-dice-container">
              {diceValues.map((value, index) => (
                <Dice
                  key={index}
                  value={value}
                  isSelected={selectedDice.includes(index)}
                  isRolling={isRolling}
                  onClick={() => toggleDiceSelection(index)}
                  disabled={rollCount >= 3}
                />
              ))}
            </div>
            <div className="roll-button-container">
              <Button
                type="primary"
                onClick={handleRollDice}
                disabled={!gameId || rollCount >= 3}
                style={{
                  cursor: rollCount >= 3 ? 'not-allowed' : 'pointer',
                  opacity: rollCount >= 3 ? 0.5 : 1
                }}
              >
                Roll Dice
              </Button>
              <Text className="roll-count" style={{ marginLeft: '8px' }}>
                Roll Count: {Math.min(rollCount, 3)}/3
              </Text>
            </div>
          </div>
        </div>

        <Scoreboard
          currentPlayer={currentPlayer}
          playerCategories={playerCategories}
          calculateScores={calculateScores}
          diceValues={diceValues}
          rollCount={rollCount}
          handleScoreCategoryClick={handleScoreCategoryClick}
          onTurnComplete={onTurnComplete}
        />
      </Content>
    </Layout>
  );
};

export default LobbyView;