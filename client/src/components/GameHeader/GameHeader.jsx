import React, { useState } from 'react';
import { Layout, Space, Button, Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import MultiplayerModal from '../../components/Multiplayer/MultiplayerModal';

const { Header } = Layout;

const GameHeader = ({ 
  currentPlayer, 
  handleNewGame, 
  handleLogout,
  socket,
  onStartMultiplayerGame 
}) => {
  const [isMultiplayerModalVisible, setIsMultiplayerModalVisible] = useState(false);

  const handlePlayerSelect = (selectedPlayer) => {
    onStartMultiplayerGame(selectedPlayer);
  };

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
          <Button>
            New Game <DownOutlined />
          </Button>
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

      {isMultiplayerModalVisible && (
        <MultiplayerModal
          visible={isMultiplayerModalVisible}
          onClose={() => setIsMultiplayerModalVisible(false)}
          onPlayerSelect={handlePlayerSelect}
          currentPlayerId={currentPlayer?.player_id}
          socket={socket}
        />
      )}
    </Header>
  );
};

export default GameHeader;