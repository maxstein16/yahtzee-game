// src/components/GameHeader/GameHeader.js
import React from 'react';
import { Layout, Space, Button } from 'antd';

const { Header } = Layout;

const GameHeader = ({ 
  currentPlayer, 
  handleNewGame, 
  handleLogout
}) => {
  return (
    <Header className="flex items-center justify-between px-6 bg-white shadow">
      <div className="flex items-center gap-4">
        <Button type="primary" onClick={() => handleNewGame('multiplayer')}>
          New Game
        </Button>
      </div>

      <Space>
        <span className="text-gray-700">
          {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
        </span>
        <Button onClick={handleLogout} type="primary" danger>
          Logout
        </Button>
      </Space>
    </Header>
  );
};

export default GameHeader;