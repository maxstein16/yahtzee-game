import React from 'react';
import { Layout, Typography, Button, Space, Spin, Modal, List } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import Scoreboard from '../../components/ScoreBoard/ScoreBoard';
import Dice from '../Dice';
import Chat from '../../components/Chat/Chat';
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

const GameHeader = ({ currentPlayer, handleNewGame, handleLogout, setIsChatVisible, gameMode }) => (
  <Header className="top-nav">
    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
      <Space>
        <Button onClick={() => handleNewGame('singleplayer')} 
                type={gameMode === 'singleplayer' ? 'primary' : 'default'}>
          Single Player
        </Button>
        <Button onClick={() => handleNewGame('multiplayer')}
                type={gameMode === 'multiplayer' ? 'primary' : 'default'}>
          Multiplayer
        </Button>
        {gameMode === 'multiplayer' && (
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

const MultiplayerLobby = ({ 
  isVisible, 
  onClose, 
  availablePlayers, 
  pendingRequests, 
  onRequestGame, 
  currentPlayer 
}) => (
  <Modal
    title="Multiplayer Lobby"
    open={isVisible}
    onCancel={onClose}
    footer={null}
    width={600}
  >
    <Space direction="vertical" style={{ width: '100%' }}>
      <Title level={5}>Available Players</Title>
      <List
        dataSource={availablePlayers}
        renderItem={player => (
          <List.Item
            actions={[
              <Button
                type="primary"
                onClick={() => onRequestGame(player)}
                disabled={pendingRequests.includes(player.id)}
              >
                {pendingRequests.includes(player.id) 
                  ? 'Request Sent' 
                  : 'Request Game'}
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={<UserOutlined />}
              title={player.name}
              description={`Status: ${player.status || 'Available'}`}
            />
          </List.Item>
        )}
        locale={{
          emptyText: (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Text type="secondary">No players available</Text>
            </div>
          )
        }}
      />
    </Space>
  </Modal>
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
      lastMove={opponentState.lastCategory ? 
        `Scored ${opponentState.turnScore} in ${opponentState.lastCategory}` : 
        undefined}
    />
  </div>
);

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
        currentPlayer={{ name: 'Opponent', player_id: '9' }}
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
        setIsChatVisible={props.setIsChatVisible}
        gameMode={props.gameMode}
      />

      <Content className="game-container">
        {props.gameId ? (
          <>
            <GameBoard
              currentPlayer={props.currentPlayer}
              diceValues={props.diceValues}
              selectedDice={props.selectedDice}
              isRolling={props.isRolling}
              rollCount={props.rollCount}
              handleRollDice={props.handleRollDice}
              toggleDiceSelection={props.toggleDiceSelection}
              opponentState={props.opponentState}
              gameMode={props.gameMode}
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
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Title level={2}>Welcome to Yahtzee!</Title>
            <Text>Choose a game mode to start playing</Text>
          </div>
        )}
      </Content>

      <MultiplayerLobby
        isVisible={props.showMultiplayerLobby}
        onClose={props.onCloseMultiplayerLobby}
        availablePlayers={props.availablePlayers}
        pendingRequests={props.pendingRequests}
        onRequestGame={props.onRequestGame}
        currentPlayer={props.currentPlayer}
      />

      {props.gameMode === 'multiplayer' && (
        <Modal
          title="Game Chat"
          open={props.isChatVisible}
          onCancel={() => props.setIsChatVisible(false)}
          footer={null}
          width={400}
        >
          {props.gameId && props.currentPlayer && (
            <Chat
              gameId={props.gameId}
              playerId={props.currentPlayer.player_id}
              playerName={props.currentPlayer.name}
            />
          )}
        </Modal>
      )}
    </Layout>
  );
};

LobbyView.propTypes = {
  // ... existing prop types ...
  showMultiplayerLobby: PropTypes.bool.isRequired,
  onCloseMultiplayerLobby: PropTypes.func.isRequired,
  availablePlayers: PropTypes.array.isRequired,
  pendingRequests: PropTypes.array.isRequired,
  onRequestGame: PropTypes.func.isRequired,
};

export default LobbyView;