import React, { useState } from 'react';
import { Layout, Space, Button, Divider, Modal, List, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const GameHeader = ({
  currentPlayer,
  handleNewGame,
  handleLogout,
  socket,
  availablePlayers
}) => {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleChallenge = (opponent) => {
    if (socket) {
      socket.emit('gameChallenge', {
        challenger: { id: currentPlayer.player_id, name: currentPlayer.name },
        opponentId: opponent.id,
      });
      message.info(`Challenge sent to ${opponent.name}`);
      setIsModalVisible(false);
    }
  };

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
          onClick={() => setIsModalVisible(true)} // Open modal for multiplayer
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
        <Button onClick={handleLogout} type="primary" danger>
          Logout
        </Button>
      </Space>

      {/* Multiplayer Challenge Modal */}
      <Modal
        title="Challenge a Player"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <List
          dataSource={availablePlayers}
          renderItem={(player) => (
            <List.Item
              actions={[
                <Button type="primary" onClick={() => handleChallenge(player)}>
                  Challenge
                </Button>
              ]}
            >
              {player.name}
            </List.Item>
          )}
        />
      </Modal>
    </Header>
  );
};

export default GameHeader;