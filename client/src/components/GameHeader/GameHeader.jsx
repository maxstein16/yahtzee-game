import React from 'react';
import { Layout, Space, Button, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const GameHeader = ({ 
  currentPlayer, 
  handleNewGame, 
  handleLogout
}) => {
  const navigate = useNavigate();

  return (
    <Header className="flex items-center justify-between px-6 bg-white shadow">
      <div className="flex items-center gap-4">
        {/* Left side - Game buttons */}
        <Button 
          type="primary" 
          onClick={() => navigate('/singleplayer')}
          className="bg-blue-500"
        >
          Single Player
        </Button>
        <Button 
          type="primary"
          onClick={() => navigate('/multiplayer')}
          className="bg-green-500"
        >
          Multiplayer
        </Button>
        <Divider type="vertical" />
        <Button 
          onClick={handleNewGame}
          className="bg-yellow-500 text-white hover:bg-yellow-600"
        >
          New Game
        </Button>
      </div>

      {/* Right side - User info and logout */}
      <Space>
        <span className="text-gray-700">
          {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
        </span>
        <Button 
          onClick={handleLogout} 
          type="primary" 
          danger
        >
          Logout
        </Button>
      </Space>
    </Header>
  );
};

export default GameHeader;