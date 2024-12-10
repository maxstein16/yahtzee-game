import React, { useState } from 'react';
import { Space, Button, Dropdown } from 'antd';
import { Menu } from 'lucide-react';
import MultiplayerModal from '../Multiplayer/MultiplayerModal';

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

  // Define menu items
  const dropdownItems = [
    {
      key: '1',
      label: 'Single Player',
      onClick: () => handleNewGame('single')
    },
    {
      key: '2',
      label: 'Multiplayer',
      onClick: () => setIsMultiplayerModalVisible(true)
    }
  ];

  return (
    <div className="w-full px-4 py-2 bg-red-500 flex justify-between items-center">
      <Space>
        <Dropdown
          menu={{ items: dropdownItems }}
          placement="bottomLeft"
        >
          <Button type="default" className="flex items-center gap-2">
            <Menu className="w-4 h-4" />
            <span>New Game</span>
          </Button>
        </Dropdown>
      </Space>

      <Space>
        <span className="text-white">
          {currentPlayer?.name ? `Welcome, ${currentPlayer.name}` : 'Loading...'}
        </span>
        <Button onClick={handleLogout} type="primary" danger>
          Logout
        </Button>
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
    </div>
  );
};

export default GameHeader;