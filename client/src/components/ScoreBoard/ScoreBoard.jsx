import React, { useEffect, useState } from 'react';
import { Typography, message } from 'antd';
import API from '../../utils/api';
import '../../styles/ScoreBoard.css';

const { Title } = Typography;

const Scoreboard = ({
  currentPlayer,
  playerCategories,
  calculateScores,
  diceValues,
  rollCount,
  handleScoreCategoryClick,
  gameId
}) => {
  const [savedScores, setSavedScores] = useState({});

  // Initial load of scores
  useEffect(() => {
    const loadInitialScores = async () => {
      if (!currentPlayer?.player_id || !gameId) return;

      try {
        const existingScores = await API.getPlayerCategories(currentPlayer.player_id);
        const scoreMap = {};
        existingScores.forEach(cat => {
          if (cat.score !== null) {
            scoreMap[cat.name] = cat.score;
          }
        });
        setSavedScores(scoreMap);

        if (Object.keys(scoreMap).length === existingScores.length) {
          await API.endGame(gameId);
          const total = await API.getPlayerTotalScore(currentPlayer.player_id);
          message.success(`Game Complete! Final Score: ${total.totalScore}`);
        }
      } catch (error) {
        console.error('Error loading initial scores:', error);
      }
    };

    loadInitialScores();
  }, []);

  // Update scores during gameplay
  useEffect(() => {
    const fetchSavedScores = async () => {
      if (!currentPlayer?.player_id || !gameId) return;

      try {
        const categories = await API.getPlayerCategories(currentPlayer.player_id);
        const scoreMap = {};
        categories.forEach(cat => {
          if (cat.score !== null) {
            scoreMap[cat.name] = cat.score;
          }
        });
        setSavedScores(scoreMap);

        if (Object.keys(scoreMap).length === categories.length) {
          await API.endGame(gameId);
          const total = await API.getPlayerTotalScore(currentPlayer.player_id);
          message.success(`Game Complete! Final Score: ${total.totalScore}`);
        }
      } catch (error) {
        console.error('Error fetching saved scores:', error);
      }
    };

    fetchSavedScores();
  }, [currentPlayer?.player_id, gameId, playerCategories]);

  const getDisplayScore = (category) => {
    if (category.name in savedScores) {
      return savedScores[category.name];
    }
    
    if (rollCount > 0) {
      const calculatedScores = calculateScores(diceValues);
      return calculatedScores[category.name];
    }
    
    return '-';
  };

  const isCategoryAvailable = (category) => {
    return rollCount > 0 && !(category.name in savedScores);
  };

  const getRowStyles = (category, isAvailable) => {
    const isUsed = category.name in savedScores;
    return {
      cursor: isAvailable ? 'pointer' : 'default',
      backgroundColor: isUsed ? '#f0f0f0' : 'white',
      color: isUsed ? '#666' : 'black',
      pointerEvents: isUsed ? 'none' : 'auto',
      transition: 'all 0.3s ease'
    };
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;

    try {
      const calculatedScores = calculateScores(diceValues);
      const scoreToSave = calculatedScores[category.name];

      await handleScoreCategoryClick(category.name);

      setSavedScores(prev => ({
        ...prev,
        [category.name]: scoreToSave
      }));

      // Fetch updated scores after saving
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      const updatedScoreMap = {};
      updatedCategories.forEach(cat => {
        if (cat.score !== null) {
          updatedScoreMap[cat.name] = cat.score;
        }
      });
      setSavedScores(updatedScoreMap);
    } catch (error) {
      console.error('Error saving score:', error);
      message.error('Failed to save score');
    }
  };

  return (
    <div className="scoreboard">
      <Title level={4}>Scoreboard</Title>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>{currentPlayer?.name || 'Player'}</th>
          </tr>
        </thead>
        <tbody>
          {playerCategories.map((category) => {
            const isAvailable = isCategoryAvailable(category);
            const score = getDisplayScore(category);
            const styles = getRowStyles(category, isAvailable);
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={isAvailable ? 'clickable' : ''}
                style={styles}
              >
                <td style={{ 
                  textTransform: 'capitalize',
                  color: styles.color 
                }}>
                  {category.name}
                </td>
                <td style={{ 
                  color: styles.color,
                  fontWeight: category.name in savedScores ? 'bold' : 'normal'
                }}>
                  {score}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);