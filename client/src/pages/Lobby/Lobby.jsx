import React from 'react';
import { Layout, Typography, Button, Space, Modal, Spin } from 'antd';
import Scoreboard from '../../components/ScoreBoard/ScoreBoard';
import Dice from '../Dice';
import Chat from '../../components/Chat/Chat';
import PropTypes from 'prop-types';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LoadingView = () => (
  <Layout>
    <Content>
      <Spin size="large" />
      <Text>Loading game...</Text>
    </Content>
  </Layout>
);

const LobbyView = ({
  currentPlayer,
  gameMode,
  setIsChatVisible,
  isChatVisible,
  handleNewGame,
  handleDiceRoll,
  diceValues,
  selectedDice,
  rollCount,
  playerCategories,
  isLoading,
  opponentState,
}) => {
  if (isLoading) return <LoadingView />;

  return (
    <Layout>
      <Header>
        <Space>
          <Button onClick={() => handleNewGame('singleplayer')}>Single Player</Button>
          <Button onClick={() => handleNewGame('multiplayer')}>Multiplayer</Button>
          {gameMode === 'multiplayer' && <Button onClick={() => setIsChatVisible(true)}>Chat</Button>}
        </Space>
        <Text>{currentPlayer?.name}</Text>
      </Header>

      <Content>
        <div>
          <Title>Dice Roll</Title>
          <Button onClick={handleDiceRoll}>Roll Dice</Button>
          <Dice diceValues={diceValues} selectedDice={selectedDice} />
          <Scoreboard categories={playerCategories} />
          {opponentState && <Scoreboard categories={opponentState.categories} />}
        </div>
      </Content>

      {isChatVisible && (
        <Modal visible footer={null}>
          <Chat />
        </Modal>
      )}
    </Layout>
  );
};

LobbyView.propTypes = {
  currentPlayer: PropTypes.object,
  gameMode: PropTypes.string,
  setIsChatVisible: PropTypes.func.isRequired,
  isChatVisible: PropTypes.bool.isRequired,
  handleNewGame: PropTypes.func.isRequired,
  handleDiceRoll: PropTypes.func.isRequired,
  diceValues: PropTypes.arrayOf(PropTypes.number),
  selectedDice: PropTypes.arrayOf(PropTypes.number),
  rollCount: PropTypes.number,
  playerCategories: PropTypes.array,
  isLoading: PropTypes.bool,
  opponentState: PropTypes.object,
};

export default LobbyView;
