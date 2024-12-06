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
    // Return saved score if exists
    if (savedScores[category.name] !== undefined) {
      return savedScores[category.name];
    }
    
    // Calculate potential score if dice have been rolled
    if (rollCount > 0) {
      const potentialScores = calculateScores(diceValues);
      return potentialScores[category.name] ?? '-';
    }
    
    return '-';
  };

  const handleClick = async (category) => {
    if (savedScores[category.name] !== undefined || rollCount === 0) {
      return;
    }

    const potentialScores = calculateScores(diceValues);
    const scoreToSubmit = potentialScores[category.name];
    
    if (scoreToSubmit === undefined) {
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
            const canClick = !isUsed && rollCount > 0;
            
            return (
              <tr
                key={category.category_id}
                onClick={() => canClick && handleClick(category)}
                className={canClick ? 'clickable-row' : ''}
                style={{
                  cursor: canClick ? 'pointer' : 'default',
                  backgroundColor: 'white'
                }}
              >
                <td style={{ textTransform: 'capitalize' }}>
                  {category.name}
                </td>
                <td>
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