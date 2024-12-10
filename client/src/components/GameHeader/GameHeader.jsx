import React, { useState } from 'react';
import { Layout, Space, Button, Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import MultiplayerModal from '../../components/Multiplayer/MultiplayerModal';
import PropTypes from 'prop-types';

const { Header } = Layout;

const GameHeader = ({ 
  currentPlayer, 
  handleNewGame, 
  handleLogout,
  socket,
  isMultiplayerModalVisible,
  setIsMultiplayerModalVisible,
  onPlayerSelect
}) => {
  const items = [
    {
      key: 'single',
      label: 'Single Player',
      onClick: () => handleNewGame('singleplayer')
    },
    {
      key: 'multi',
      label: 'Multiplayer',
      onClick: () => setIsMultiplayerModalVisible(true)
    }
  ];

  return (
    <Header className="top-nav">
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Dropdown 
          menu={{ items }} 
          trigger={['click']}
        >
          <span onClick={e => e.stopPropagation()}>
            <Button>
              New Game <DownOutlined />
            </Button>
          </span>
        </Dropdown>
        <Space>
          <span style={{ color: 'white' }}>
            {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
          </span>
          <Button onClick={handleLogout} type="primary" danger>
            Logout
          </Button>
        </Space>
      </Space>

      <MultiplayerModal
        visible={isMultiplayerModalVisible}
        onClose={() => setIsMultiplayerModalVisible(false)}
        onPlayerSelect={onPlayerSelect}
        currentPlayerId={currentPlayer?.player_id}
        socket={socket}
      />
    </Header>
  );
};

GameHeader.propTypes = {
  currentPlayer: PropTypes.shape({
    name: PropTypes.string,
    player_id: PropTypes.string
  }),
  handleNewGame: PropTypes.func.isRequired,
  handleLogout: PropTypes.func.isRequired,
  socket: PropTypes.object,
  isMultiplayerModalVisible: PropTypes.bool,
  setIsMultiplayerModalVisible: PropTypes.func,
  onPlayerSelect: PropTypes.func
};

export default GameHeader;