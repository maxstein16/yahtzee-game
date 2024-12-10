import React from 'react';
import { Layout } from 'antd';
import PropTypes from 'prop-types';
import GameHeader from '../GameHeader';
import GameBoard from '../GameBoard';
import ScoreboardContainer from '../ScoreboardContainer';

const { Content } = Layout;

const LoadingView = () => (
  <Layout style={{ height: '100vh' }}>
    <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div>Loading...</div>
    </Content>
  </Layout>
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
  // Multiplayer props
  socket,
  isMultiplayerModalVisible,
  setIsMultiplayerModalVisible,
  onPlayerSelect
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
        socket={socket}
        isMultiplayerModalVisible={isMultiplayerModalVisible}
        setIsMultiplayerModalVisible={setIsMultiplayerModalVisible}
        onPlayerSelect={onPlayerSelect}
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
  // Multiplayer prop types
  socket: PropTypes.object,
  isMultiplayerModalVisible: PropTypes.bool,
  setIsMultiplayerModalVisible: PropTypes.func,
  onPlayerSelect: PropTypes.func
};

export default LobbyView;