import React from 'react';
import { Layout, Typography, Button, Space, Spin, Divider, message } from 'antd';
import Scoreboard from '../../components/ScoreBoard/ScoreBoard';
import Dice from '../Dice';
import '../../styles/Lobby.css';
import PropTypes from 'prop-types';

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

GameHeader.propTypes = {
  currentPlayer: PropTypes.shape({
    name: PropTypes.string,
    player_id: PropTypes.string
  }),
  handleNewGame: PropTypes.func.isRequired,
  handleLogout: PropTypes.func.isRequired
};

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
  isOpponentTurn,
  lastMove
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
        <div>
          <Text className="opponent-status" style={{ 
            color: isOpponentTurn ? '#1890ff' : '#666',
            fontWeight: isOpponentTurn ? 'bold' : 'normal'
          }}>
            {isOpponentTurn ? "Opponent is rolling..." : "Waiting for player..."}
          </Text>
          {lastMove && (
            <Text className="last-move" style={{ 
              display: 'block',
              fontSize: '12px',
              color: '#666'
            }}>
              Last move: {lastMove}
            </Text>
          )}
        </div>
      )}
      <Text className="roll-count" style={{ marginLeft: '8px' }}>
        Roll Count: {Math.min(rollCount, 3)}/3
      </Text>
    </div>
  </div>
);

PlayerSection.propTypes = {
  isOpponent: PropTypes.bool,
  name: PropTypes.string.isRequired,
  dice: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedDice: PropTypes.arrayOf(PropTypes.number).isRequired,
  isRolling: PropTypes.bool.isRequired,
  rollCount: PropTypes.number.isRequired,
  onDiceClick: PropTypes.func.isRequired,
  handleRoll: PropTypes.func,
  disabled: PropTypes.bool.isRequired,
  isOpponentTurn: PropTypes.bool.isRequired,
  lastMove: PropTypes.string
};

import React from 'react';
import { Typography } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';

const GameBoard = ({
  currentPlayer,
  diceValues,
  selectedDice,
  isRolling,
  rollCount,
  handleRollDice,
  toggleDiceSelection,
  playerCategories,
  calculateScores,
  handleScoreCategoryClick,
  onTurnComplete,
  gameId,
  opponentState,
  shouldResetScores
}) => {
  return (
    <div className="flex flex-1 gap-4 p-4 h-full">
      {/* Left Scoreboard */}
      <div className="w-1/4 min-w-[200px]">
        <Card className="h-full overflow-y-auto">
          <div className="p-4">
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
              <div className="text-center p-4">
                <span className="loading loading-spinner loading-md"></span>
                <Typography>Loading scoreboard...</Typography>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Center Dice Section */}
      <div className="flex-1">
        <Card className="h-full">
          <div className="flex flex-col h-full">
            {/* Player Section */}
            <div className="flex-1 p-4 flex flex-col items-center justify-center">
              <Typography variant="h4" className="mb-4">{currentPlayer?.name || 'Player'}</Typography>
              <div className="flex gap-4 mb-4">
                {diceValues.map((value, index) => (
                  <div
                    key={index}
                    onClick={() => toggleDiceSelection(index)}
                    className={`w-12 h-12 flex items-center justify-center rounded-lg cursor-pointer border-2
                      ${selectedDice.includes(index) ? 'border-blue-500' : 'border-gray-200'}
                      ${isRolling ? 'animate-bounce' : ''}`}
                  >
                    {value}
                  </div>
                ))}
              </div>
              <button
                onClick={handleRollDice}
                disabled={rollCount >= 3 || opponentState.isOpponentTurn}
                className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
              >
                Roll Dice ({rollCount}/3)
              </button>
            </div>
            
            {/* Opponent Section */}
            <div className="flex-1 p-4 flex flex-col items-center justify-center border-t">
              <Typography variant="h4" className="mb-4">Opponent</Typography>
              <div className="flex gap-4 mb-4">
                {opponentState.dice.map((value, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-gray-200"
                  >
                    {value}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                {opponentState.isOpponentTurn ? "Opponent is rolling..." : "Waiting for player..."}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Scoreboard */}
      <div className="w-1/4 min-w-[200px]">
        <Card className="h-full overflow-y-auto">
          <div className="p-4">
            {opponentState.categories && opponentState.categories.length > 0 ? (
              <Scoreboard
                key={`opponent-${gameId}-${shouldResetScores}`}
                gameId={gameId}
                currentPlayer={{ name: 'AI Opponent', player_id: '9' }}
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
              <div className="text-center p-4">
                <span className="loading loading-spinner loading-md"></span>
                <Typography>Loading opponent scoreboard...</Typography>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

GameBoard.propTypes = {
  currentPlayer: PropTypes.shape({
    name: PropTypes.string,
    player_id: PropTypes.string
  }),
  diceValues: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedDice: PropTypes.arrayOf(PropTypes.number).isRequired,
  isRolling: PropTypes.bool.isRequired,
  rollCount: PropTypes.number.isRequired,
  handleRollDice: PropTypes.func.isRequired,
  toggleDiceSelection: PropTypes.func.isRequired,
  opponentState: PropTypes.shape({
    categories: PropTypes.array,
    dice: PropTypes.arrayOf(PropTypes.number),
    score: PropTypes.number,
    rollCount: PropTypes.number,
    isOpponentTurn: PropTypes.bool,
    lastCategory: PropTypes.string,
    turnScore: PropTypes.number
  }).isRequired
};

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

    {opponentState.categories && opponentState.categories.length > 0 ? (
      <Scoreboard
        key={`opponent-${gameId}-${shouldResetScores}`}  // Changed this line
        gameId={gameId}
        currentPlayer={{ name: 'AI Opponent', player_id: '9' }}
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

ScoreboardContainer.propTypes = {
  gameId: PropTypes.string,
  currentPlayer: PropTypes.shape({
    name: PropTypes.string,
    player_id: PropTypes.string
  }),
  playerCategories: PropTypes.array.isRequired,
  calculateScores: PropTypes.func.isRequired,
  diceValues: PropTypes.arrayOf(PropTypes.number).isRequired,
  rollCount: PropTypes.number.isRequired,
  handleScoreCategoryClick: PropTypes.func.isRequired,
  onTurnComplete: PropTypes.func.isRequired,
  shouldResetScores: PropTypes.bool.isRequired,
  opponentState: PropTypes.shape({
    categories: PropTypes.array,
    dice: PropTypes.arrayOf(PropTypes.number),
    score: PropTypes.number,
    rollCount: PropTypes.number,
    isOpponentTurn: PropTypes.bool,
    lastCategory: PropTypes.string,
    turnScore: PropTypes.number
  }).isRequired
};

const LobbyView = (props) => {
  if (props.isLoading) {
    return <LoadingView />;
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <GameHeader 
        currentPlayer={props.currentPlayer}
        handleNewGame={props.handleNewGame}
        handleLogout={props.handleLogout}
      />

      <Content className="game-container">
        <GameBoard
          currentPlayer={props.currentPlayer}
          diceValues={props.diceValues}
          selectedDice={props.selectedDice}
          isRolling={props.isRolling}
          rollCount={props.rollCount}
          handleRollDice={props.handleRollDice}
          toggleDiceSelection={props.toggleDiceSelection}
          opponentState={props.opponentState}
        />

        <ScoreboardContainer
          gameId={props.gameId}
          currentPlayer={props.currentPlayer}
          playerCategories={props.playerCategories}
          calculateScores={props.calculateScores}
          diceValues={props.diceValues}
          rollCount={props.rollCount}
          handleScoreCategoryClick={props.handleScoreCategoryClick}
          onTurnComplete={props.onTurnComplete}
          shouldResetScores={props.shouldResetScores}
          opponentState={props.opponentState}
        />
      </Content>
    </Layout>
  );
};

LobbyView.propTypes = {
  currentPlayer: PropTypes.shape({
    name: PropTypes.string,
    player_id: PropTypes.string
  }),
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