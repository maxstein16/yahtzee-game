import React from 'react';
import { Space, Button, Dropdown, Menu } from 'antd';
import { DownOutlined } from '@ant-design/icons';

const GameHeader = ({ currentPlayer, mode, handleNewGame, handleLogout, setIsChatVisible }) => {
  const menu = (
    <Menu>
      <Menu.Item key="single" onClick={() => handleNewGame('singleplayer')}>
        New Single Player
      </Menu.Item>
      <Menu.Item key="multi" onClick={() => handleNewGame('multiplayer')}>
        New Multiplayer
      </Menu.Item>
    </Menu>
  );

  return (
    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
      <Space>
        <Dropdown overlay={menu} trigger={['click']}>
          <Button>
            New Game <DownOutlined />
          </Button>
        </Dropdown>
        <Button
          type={mode === 'singleplayer' ? 'primary' : 'default'}
          onClick={() => handleNewGame('singleplayer')}
        >
          Single Player
        </Button>
        <Button
          type={mode === 'multiplayer' ? 'primary' : 'default'}
          onClick={() => handleNewGame('multiplayer')}
        >
          Multiplayer
        </Button>
        {mode === 'multiplayer' && (
          <Button onClick={() => setIsChatVisible(true)}>Chat</Button>
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
  );
};

export default GameHeader;