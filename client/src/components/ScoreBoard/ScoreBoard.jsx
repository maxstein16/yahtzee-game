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
      } finally {
        setLoading(false);
      }
    };

    loadScores();
  }, [currentPlayer?.player_id]);

  const getDisplayScore = (categoryName) => {
    // If score is saved, show saved score
    if (savedScores[categoryName] !== undefined) {
      return savedScores[categoryName];
    }
    
    // If dice have been rolled, calculate potential score
    if (rollCount > 0) {
      const scores = calculateScores(diceValues);
      return scores[categoryName];
    }
    
    return '-';
  };

  const handleClick = async (categoryName) => {
    if (savedScores[categoryName] !== undefined || rollCount === 0) {
      return;
    }

    try {
      await handleScoreCategoryClick(categoryName);
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      const newScoreMap = {};
      updatedCategories.forEach(cat => {
        if (cat.score !== null) {
          newScoreMap[cat.name] = cat.score;
        }
      });
      setSavedScores(newScoreMap);
    } catch (error) {
      message.error('Failed to save score');
    }
  };

  if (loading) return <div>Loading scores...</div>;

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
            const canClick = !isUsed && rollCount > 0;
            const score = getDisplayScore(category.name);
            
            return (
              <tr
                key={category.category_id}
                onClick={() => canClick && handleClick(category.name)}
                className={canClick ? 'clickable-row' : ''}
                style={{
                  cursor: canClick ? 'pointer' : 'default',
                  backgroundColor: 'white'
                }}
              >
                <td style={{ textTransform: 'capitalize' }}>
                  {category.name}
                </td>
                <td style={{ textAlign: 'center' }}>
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