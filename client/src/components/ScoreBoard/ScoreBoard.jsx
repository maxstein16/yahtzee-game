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
        setSavedScores({});
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

  const handleClick = async (category) => {
    // Only allow clicking if it's not already scored AND there's been at least one roll
    if (savedScores[category.name] !== undefined || rollCount === 0) {
      return;
    }

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
            const isUsed = savedScores[category.name] !== undefined;
            const isClickable = !isUsed && rollCount > 0;
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                style={{
                  cursor: isClickable ? 'pointer' : 'default',
                  backgroundColor: isUsed ? '#f0f0f0' : 'white',
                  opacity: rollCount === 0 ? 0.5 : 1
                }}
              >
                <td style={{ textTransform: 'capitalize' }}>
                  {category.name}
                </td>
                <td style={{ 
                  fontWeight: isUsed ? 'bold' : 'normal',
                  color: isUsed ? '#666' : 'black'
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