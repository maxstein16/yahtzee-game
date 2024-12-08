import React, { useEffect } from 'react';
import { Layout, Typography, Button, Space, Spin, Divider, message } from 'antd';
import Scoreboard from '../../components/ScoreBoard/ScoreBoard';
import Dice from '../../pages/Dice';
import '../../styles/Lobby.css';
import { executeOpponentTurn } from '../../services/opponentService';
import { initializeDefaultCategories } from '../../services/categoryService';

const INITIAL_DICE_VALUES = [1, 1, 1, 1, 1];

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LobbyView = ({
  currentPlayer,
  gameId,
  diceValues,
  selectedDice,
  isRolling,
  rollCount,
  playerCategories,
  handleNewGame,
  handleLogout,
  handleRollDice,
  toggleDiceSelection,
  shouldResetScores,
  handleScoreCategoryClick,
  calculateScores,
  onTurnComplete,
  isLoading,
  API,
  opponentCategories,
  opponentDice,
  opponentScore,
  opponentRollCount,
  isOpponentTurn,
  setOpponentCategories,
  setOpponentDice,
  setOpponentScore,
  setOpponentRollCount,
  setIsOpponentTurn,
}) => {
  // Handle opponent's turn after player completes theirs
  useEffect(() => {
    const playOpponentTurn = async () => {
      if (isOpponentTurn && gameId) {
        try {
          const result = await executeOpponentTurn(
            gameId,
            '9',
            opponentCategories,
            opponentDice,
            API 
          );
          setOpponentDice(result.finalDice);
          setOpponentRollCount(result.rollCount);
          setOpponentScore((prev) => prev + result.score);
  
          // Update opponent's categories
          const updatedCategories = await API.getPlayerCategories('9'); // Ensure API is defined here
          setOpponentCategories(updatedCategories);
  
          message.info(`Opponent scored ${result.score} points in ${result.selectedCategory.name}!`);
          setIsOpponentTurn(false);
        } catch (error) {
          console.error('Error during opponent turn:', error);
          message.error('Opponent turn failed.');
          setIsOpponentTurn(false);
        }
      }
    };
  
    playOpponentTurn();
  }, [isOpponentTurn, gameId, opponentCategories, opponentDice, API]);  

  // Initialize opponent when game starts
  useEffect(() => {
    const initializeOpponent = async () => {
      if (!gameId) return;
  
      try {
        let categories = await API.getPlayerCategories('9'); // Replace '9' with opponent ID
  
        if (!categories || categories.length === 0) {
          categories = await initializeDefaultCategories('9'); // Reuse the function for opponents
        }
  
        setOpponentCategories(categories);
        setOpponentDice(INITIAL_DICE_VALUES);
        setOpponentScore(0);
        setOpponentRollCount(0);
      } catch (error) {
        console.error('Error initializing opponent:', error);
        message.error('Failed to initialize opponent.');
      }
    };
  
    initializeOpponent();
  }, [gameId]);
  

  // Modified turn complete handler
  const handleTurnComplete = () => {
    onTurnComplete();
    setIsOpponentTurn(true);
  };

  if (isLoading) {
    return (
      <Layout style={{ height: '100vh' }}>
        <Header className="top-nav">
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Spin size="large" />
          </Space>
        </Header>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading game...</Text>
        </Content>
      </Layout>
    );
  }

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
          {/* Player Section */}
          <div className="player-section">
            <Title level={4}>{currentPlayer?.name || 'Player'}</Title>
            <div className="game-dice-container">
              {diceValues.map((value, index) => (
                <Dice
                  key={index}
                  value={value}
                  isSelected={selectedDice.includes(index)}
                  isRolling={isRolling}
                  onClick={() => toggleDiceSelection(index)}
                  disabled={rollCount >= 3 || isOpponentTurn}
                />
              ))}
            </div>
            <div className="roll-button-container">
              <Button
                type="primary"
                onClick={handleRollDice}
                disabled={!gameId || rollCount >= 3 || isOpponentTurn}
                style={{
                  cursor: (rollCount >= 3 || isOpponentTurn) ? 'not-allowed' : 'pointer',
                  opacity: (rollCount >= 3 || isOpponentTurn) ? 0.5 : 1
                }}
              >
                Roll Dice
              </Button>
              <Text className="roll-count" style={{ marginLeft: '8px' }}>
                Roll Count: {Math.min(rollCount, 3)}/3
              </Text>
            </div>
          </div>

          <Divider type="vertical" style={{ height: '100%' }} />

          {/* Opponent Section */}
          <div className="player-section">
            <Title level={4}>Opponent</Title>
            <div className="game-dice-container">
              {opponentDice.map((value, index) => (
                <Dice
                  key={index}
                  value={value}
                  isSelected={false}
                  isRolling={isOpponentTurn}
                  disabled={true}
                />
              ))}
            </div>
            <div className="roll-button-container">
              <Text>
                {isOpponentTurn ? "Opponent's turn..." : "Waiting for player..."}
              </Text>
              <Text className="roll-count" style={{ marginLeft: '8px' }}>
                Roll Count: {Math.min(opponentRollCount, 3)}/3
              </Text>
            </div>
          </div>
        </div>

        <div className="scoreboards-container" style={{ display: 'flex', justifyContent: 'space-around' }}>
          {/* Player Scoreboard */}
          {playerCategories && playerCategories.length > 0 ? (
            <Scoreboard
              key={`player-${gameId}`}
              gameId={gameId}
              currentPlayer={currentPlayer}
              playerCategories={playerCategories}
              calculateScores={calculateScores}
              diceValues={diceValues}
              rollCount={rollCount}
              handleScoreCategoryClick={handleScoreCategoryClick}
              onTurnComplete={handleTurnComplete}
              shouldResetScores={shouldResetScores}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
              <Text>Initializing scoreboard...</Text>
            </div>
          )}

          {/* Opponent Scoreboard */}
          {opponentCategories && opponentCategories.length > 0 ? (
            <Scoreboard
              key={`opponent-${gameId}`}
              gameId={gameId}
              currentPlayer={{ name: 'AI Opponent', player_id: 'opponent-1' }}
              playerCategories={opponentCategories}
              calculateScores={calculateScores}
              diceValues={opponentDice}
              rollCount={opponentRollCount}
              handleScoreCategoryClick={() => {}}
              onTurnComplete={() => {}}
              shouldResetScores={shouldResetScores}
              isOpponent={true}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
              <Text>Initializing opponent scoreboard...</Text>
            </div>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default LobbyView;
