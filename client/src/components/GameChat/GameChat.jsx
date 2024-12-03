import React from 'react';
import { Modal } from 'antd';
import Chat from '../Chat';

const GameChat = ({ isChatVisible, mode, setIsChatVisible, gameId, currentPlayer }) => {
  return (
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
  );
};

export default GameChat;