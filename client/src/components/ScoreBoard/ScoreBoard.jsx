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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScores = async () => {
      if (!currentPlayer?.player_id) {
        setLoading(false);
        return;
      }

      try {
        const categories = await API.getPlayerCategories(currentPlayer.player_id);
        const scoreMap = {};
        
        categories.forEach(cat => {
          if (cat.score !== null) {
            scoreMap[cat.name] = cat.score;
          }
        });
        
        setSavedScores(scoreMap);
      } catch (error) {
        console.error('Error loading scores:', error);
        message.error('Failed to load saved scores');
      } finally {
        setLoading(false);
      }
    };

    loadScores();
  }, [currentPlayer?.player_id]);

  useEffect(() => {
    const checkGameCompletion = async () => {
      if (!currentPlayer?.player_id || !gameId) return;

      try {
        const categories = await API.getPlayerCategories(currentPlayer.player_id);
        const allCategoriesUsed = categories.every(cat => cat.score !== null);

        if (allCategoriesUsed) {
          await API.endGame(gameId);
          const total = await API.getPlayerTotalScore(currentPlayer.player_id);
          message.success(`Game Complete! Final Score: ${total.totalScore}`);
        }
      } catch (error) {
        console.error('Error checking game completion:', error);
      }
    };

    checkGameCompletion();
  }, [currentPlayer?.player_id, gameId, savedScores]);

  const getDisplayScore = (category) => {
    if (savedScores[category.name] !== undefined) {
      return savedScores[category.name];
    }
    
    if (rollCount > 0) {
      const calculatedScores = calculateScores(diceValues);
      return calculatedScores[category.name];
    }
    
    return '-';
  };

  const isCategoryAvailable = (category) => {
    return savedScores[category.name] === undefined;
  };

  const getRowStyles = (category) => {
    const isUsed = savedScores[category.name] !== undefined;
    const isAvailable = isCategoryAvailable(category);
    
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
      await handleScoreCategoryClick(category.name);
      
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      const newScoreMap = {};
      updatedCategories.forEach(cat => {
        if (cat.score !== null) {
          newScoreMap[cat.name] = cat.score;
        }
      });
      setSavedScores(newScoreMap);
    } catch (error) {
      console.error('Error saving score:', error);
      message.error('Failed to save score');
    }
  };

  if (loading) {
    return <div>Loading scores...</div>;
  }

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
            const styles = getRowStyles(category);
            
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
                  fontWeight: savedScores[category.name] !== undefined ? 'bold' : 'normal'
                }}>
                  {getDisplayScore(category)}
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