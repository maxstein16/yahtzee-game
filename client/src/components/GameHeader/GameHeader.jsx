import React, { useState } from 'react';
import { Layout } from 'antd';
import PropTypes from 'prop-types';
import GameHeader from '../../components/GameHeader/GameHeader';
import GameBoard from '../../components/GameBoard/GameBoard';
import ScoreBoard from '../../components/ScoreBoard/ScoreBoard';
import LobbyChat from '../../pages/Lobby/LobbyChat';

const { Content } = Layout;

const LoadingView = () => (
  <Layout style={{ height: '100vh' }}>
    <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div>Loading...</div>
    </Content>
  </Layout>
);

const GameView = ({
  currentPlayer,
  gameId,
  diceValues,
  selectedDice,
  isRolling,
  rollCount,
  playerCategories,
  handleRollDice,
  toggleDiceSelection,
  shouldResetScores,
  handleScoreCategoryClick,
  calculateScores,
  onTurnComplete,
  opponentState
}) => (
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
    <ScoreBoard
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
  socket,
  isMultiplayerModalVisible,
  setIsMultiplayerModalVisible,
  onPlayerSelect,
  availablePlayers
}) => {
  const [showLobby, setShowLobby] = useState(true);

  if (isLoading) {
    return <LoadingView />;
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <GameHeader 
        currentPlayer={currentPlayer}
        handleNewGame={handleNewGame}
        handleLogout={handleLogout}
        setIsMultiplayerModalVisible={setIsMultiplayerModalVisible}
        setShowLobby={setShowLobby}
      />

      <Content className="p-6">
        {showLobby ? (
          <LobbyChat
            gameId={gameId}
            currentPlayer={currentPlayer}
            socket={socket}
            availablePlayers={availablePlayers}
            onPlayerSelect={onPlayerSelect}
          />
        ) : (
          <GameView
            currentPlayer={currentPlayer}
            gameId={gameId}
            diceValues={diceValues}
            selectedDice={selectedDice}
            isRolling={isRolling}
            rollCount={rollCount}
            playerCategories={playerCategories}
            handleRollDice={handleRollDice}
            toggleDiceSelection={toggleDiceSelection}
            shouldResetScores={shouldResetScores}
            handleScoreCategoryClick={handleScoreCategoryClick}
            calculateScores={calculateScores}
            onTurnComplete={onTurnComplete}
            opponentState={opponentState}
          />
        )}
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
  socket: PropTypes.object,
  isMultiplayerModalVisible: PropTypes.bool,
  setIsMultiplayerModalVisible: PropTypes.func,
  onPlayerSelect: PropTypes.func,
  availablePlayers: PropTypes.array
};

export default LobbyView;