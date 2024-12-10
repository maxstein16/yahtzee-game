import React, { useState, useEffect } from 'react';
import { Layout, Button, Modal, List, message } from 'antd';
import { getAvailablePlayers, createGame } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const GameHeader = ({ currentPlayer }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const navigate = useNavigate();

  const fetchPlayers = async () => {
    try {
      const players = await getAvailablePlayers();
      setAvailablePlayers(players.filter(player => player.player_id !== currentPlayer.player_id));
    } catch (error) {
      console.error('Error fetching players:', error);
      message.error('Failed to fetch available players');
    }
  };

  const handleChallenge = async (opponentId) => {
    try {
      const game = await createGame('pending', 0, currentPlayer.player_id);
      message.success('Game created! Waiting for the opponent...');
      setIsModalVisible(false);

      // Navigate to the game page or trigger socket connection for real-time updates
      navigate(`/game/${game.game.game_id}`);
    } catch (error) {
      console.error('Error creating game:', error);
      message.error('Failed to start a new game');
    }
  };

  return (
    <Header>
      <Button onClick={() => navigate('/singleplayer')}>Single Player</Button>
      <Button
        onClick={() => {
          setIsModalVisible(true);
          fetchPlayers();
        }}
      >
        Multiplayer
      </Button>

      {/* Multiplayer Modal */}
      <Modal
        title="Available Players"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <List
          dataSource={availablePlayers}
          renderItem={(player) => (
            <List.Item>
              {player.name}
              <Button onClick={() => handleChallenge(player.player_id)}>Challenge</Button>
            </List.Item>
          )}
        />
      </Modal>
    </Header>
  );
};

export default GameHeader;