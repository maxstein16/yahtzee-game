import React, { useState } from 'react';
import { Space, Button, Dropdown, Menu as AntMenu } from 'antd';
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

  const menu = (
    <AntMenu>
      <AntMenu.Item key="single" onClick={() => handleNewGame('single')}>
        Single Player
      </AntMenu.Item>
      <AntMenu.Item key="multi" onClick={() => setIsMultiplayerModalVisible(true)}>
        Multiplayer
      </AntMenu.Item>
    </AntMenu>
  );

  return (
    <div className="w-full px-4 py-2 bg-red-500 flex justify-between items-center">
      <Space>
        <Dropdown overlay={menu} trigger={['click']}>
          <Button className="flex items-center gap-2">
            <Menu className="w-4 h-4" />
            New Game
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

      <MultiplayerModal
        visible={isMultiplayerModalVisible}
        onClose={() => setIsMultiplayerModalVisible(false)}
        onPlayerSelect={handlePlayerSelect}
        currentPlayerId={currentPlayer?.player_id}
        socket={socket}
      />
    </div>
  );
};

export default GameHeader;