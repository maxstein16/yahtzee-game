import React from 'react';
import { Layout, Space, Button } from 'antd';

const { Header } = Layout;

const GameHeader = ({ currentPlayer, handleLogout }) => {
  return (
    <Header className="flex items-center justify-between px-6 bg-white shadow">
      <div className="text-xl font-bold text-gray-800">Yahtzee</div>

      <Space>
        <span className="text-gray-700">
          {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
        </span>
        <Button onClick={handleLogout} type="primary" danger>
          Sign Out
        </Button>
      </Space>
    </Header>
  );
};

export default GameHeader;
