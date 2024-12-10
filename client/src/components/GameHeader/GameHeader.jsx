import React, { useState } from 'react';
import { Space, Button, Typography } from 'antd';
import MultiplayerLobby from './MultiplayerLobby';

const GameHeader = ({ 
  currentPlayer, 
  handleNewGame, 
  handleLogout,
  websocket,
  onStartMultiplayerGame 
}) => {
  const [isMultiplayerModalVisible, setIsMultiplayerModalVisible] = useState(false);

  const handleMultiplayerClick = () => {
    setIsMultiplayerModalVisible(true);
  };

  const handleModalClose = () => {
    setIsMultiplayerModalVisible(false);
  };

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Button onClick={() => handleNewGame('single')} type="primary">
            New Single Player
          </Button>
          <Button 
            onClick={handleMultiplayerClick}
            type="primary"
            className="bg-blue-500"
          >
            Multiplayer
          </Button>
        </Space>
        <Space>
          <Typography.Text className="text-white">
            {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
          </Typography.Text>
          <Button onClick={handleLogout} type="primary" danger>
            Logout
          </Button>
        </Space>
      </Space>

      <MultiplayerLobby
        visible={isMultiplayerModalVisible}
        onClose={handleModalClose}
        currentPlayer={currentPlayer}
        onStartGame={onStartMultiplayerGame}
        websocket={websocket}
      />
    </>
  );
};

export default GameHeader;