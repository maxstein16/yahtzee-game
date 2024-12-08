import React from 'react';
import { Layout, Typography, Button, Space, Spin, Divider, message } from 'antd';
import Scoreboard from '../../components/ScoreBoard/ScoreBoard';
import Dice from '../../components/Dice';
import '../../styles/Lobby.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LoadingView = () => (
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

const GameHeader = ({ currentPlayer, handleNewGame, handleLogout }) => (
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
);

const PlayerSection = ({ 
  isOpponent,
  name,
  dice,
  selectedDice,
  isRolling,
  rollCount,
  onDiceClick,
  handleRoll,
  disabled,
  isOpponentTurn
}) => (
  <div className="player-section">
    <Title level={4}>{name}</Title>
    <div className="game-dice-container">
      {dice.map((value, index) => (
        <Dice
          key={index}
          value={value}
          isSelected={!isOpponent && selectedDice.includes(index)}
          isRolling={isRolling}
          onClick={() => onDiceClick(index)}
          disabled={disabled || isOpponent}
        />
      ))}
    </div>
    <div className="roll-button-container">
      {!isOpponent ? (
        <Button
          type="primary"
          onClick={handleRoll}
          disabled={disabled || isOpponentTurn}
          style={{
            cursor: (disabled || isOpponentTurn) ? 'not-allowed' : 'pointer',
            opacity: (disabled || isOpponentTurn) ? 0.5 : 1
          }}
        >
          Roll Dice
        </Button>
      ) : (
        <Text className="opponent-status" style={{ 
          color: isOpponentTurn ? '#1890ff' : '#666',
          fontWeight: isOpponentTurn ? 'bold' : 'normal'
        }}>
          {isOpponentTurn ? "Opponent is rolling..." : "Waiting for player..."}
        </Text>
      )}
      <Text className="roll-count" style={{ marginLeft: '8px' }}>
        Roll Count: {Math.min(rollCount, 3)}/3
      </Text>
    </div>
  </div>
);

const GameBoard = ({
  currentPlayer,
  diceValues,
  selectedDice,
  isRolling,
  rollCount,
  handleRollDice,
  toggleDiceSelection,
  opponentState
}) => (
  <div className="game-board">
    <PlayerSection
      name={currentPlayer?.name || 'Player'}
      dice={diceValues}
      selectedDice={selectedDice}
      isRolling={isRolling}
      rollCount={rollCount}
      onDiceClick={toggleDiceSelection}
      handleRoll={handleRollDice}
      disabled={rollCount >= 3}
      isOpponentTurn={opponentState.isOpponentTurn}
    />

    <Divider type="vertical" style={{ height: '100%' }} />

    <PlayerSection
      isOpponent
      name="Opponent"
      dice={opponentState.dice}
      selectedDice={[]}
      isRolling={opponentState.isOpponentTurn}
      rollCount={opponentState.rollCount}
      onDiceClick={() => {}}
      disabled={true}
      isOpponentTurn={opponentState.isOpponentTurn}
    />
  </div>
);

const ScoreboardContainer = ({
  gameId,
  currentPlayer,
  playerCategories,
  calculateScores,
  diceValues,
  rollCount,
  handleScoreCategoryClick,
  onTurnComplete,
  shouldResetScores,
  opponentState
}) => (
  <div className="scoreboards-container" style={{ display: 'flex', justifyContent: 'space-around', padding: '20px' }}>
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
        onTurnComplete={onTurnComplete}
        shouldResetScores={shouldResetScores}
        isOpponent={false}
      />
    ) : (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin />
        <Text>Initializing scoreboard...</Text>
      </div>
    )}

    {/* Opponent Scoreboard */}
    {opponentState.categories && opponentState.categories.length > 0 ? (
      <Scoreboard
        key={`opponent-${gameId}`}
        gameId={gameId}
        currentPlayer={{ name: 'AI Opponent', player_id: 'opponent-1' }}
        playerCategories={opponentState.categories}
        calculateScores={calculateScores}
        diceValues={opponentState.dice}
        rollCount={opponentState.rollCount}
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
);

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
  opponentState,
}) => {
  if (isLoading) {
    return <LoadingView />;
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <GameHeader 
        currentPlayer={currentPlayer}
        handleNewGame={handleNewGame}
        handleLogout={handleLogout}
      />

      <Content className="game-container">
        <GameBoard
          currentPlayer={currentPlayer}
          diceValues={diceValues}
          selectedDice={selectedDice}
          isRolling={isRolling}
          rollCount={rollCount}
          handleRollDice={handleRollDice}
          toggleDiceSelection={toggleDiceSelection}
          opponentState={opponentState}
        />

        <ScoreboardContainer
          gameId={gameId}
          currentPlayer={currentPlayer}
          playerCategories={playerCategories}
          calculateScores={calculateScores}
          diceValues={diceValues}
          rollCount={rollCount}
          handleScoreCategoryClick={handleScoreCategoryClick}
          onTurnComplete={onTurnComplete}
          shouldResetScores={shouldResetScores}
          opponentState={opponentState}
        />
      </Content>
    </Layout>
  );
};

// PropTypes validation (optional but recommended)
LobbyView.propTypes = {
  currentPlayer: PropTypes.object,
  gameId: PropTypes.string,
  diceValues: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedDice: PropTypes.arrayOf(PropTypes.number).isRequired,
  isRolling: PropTypes.bool.isRequired,
  rollCount: PropTypes.number.isRequired,
  playerCategories: PropTypes.array.isRequired,
  handleNewGame: PropTypes.func.isRequired,
  handleLogout: PropTypes.func.isRequired,
  handleRollDice: PropTypes.func.isRequired,
  toggleDiceSelection: PropTypes.func.isRequired,
  shouldResetScores: PropTypes.bool.isRequired,
  handleScoreCategoryClick: PropTypes.func.isRequired,
  calculateScores: PropTypes.func.isRequired,
  onTurnComplete: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  opponentState: PropTypes.shape({
    categories: PropTypes.array,
    dice: PropTypes.arrayOf(PropTypes.number),
    score: PropTypes.number,
    rollCount: PropTypes.number,
    isOpponentTurn: PropTypes.bool,
    lastCategory: PropTypes.string,
    turnScore: PropTypes.number
  }).isRequired,
};

export default LobbyView;
