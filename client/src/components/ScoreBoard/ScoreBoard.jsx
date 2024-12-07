import React, { useEffect, useState } from 'react';
import { Typography } from 'antd';
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
  gameId,
  shouldResetScores
}) => {
  const [dbScores, setDbScores] = useState({});

  useEffect(() => {
    if (shouldResetScores) {
      setDbScores({});
    }
  }, [shouldResetScores]);

  useEffect(() => {
    const fetchScores = async () => {
      if (!currentPlayer?.player_id || !gameId) return;
      try {
        const categories = await API.getPlayerCategories(currentPlayer.player_id, gameId);
        const scoreMap = {};
        categories.forEach(cat => {
          if (cat.score !== null) {
            scoreMap[cat.name] = cat.score;
          }
        });
        setDbScores(scoreMap);
      } catch (error) {
        console.error('Error fetching scores:', error);
      }
    };
    fetchScores();
  }, [currentPlayer?.player_id, gameId]);

  const getDisplayScore = (category) => {
    if (dbScores[category.name] !== undefined) {
      return dbScores[category.name];
    }
    
    if (rollCount > 0 && diceValues) {
      const scores = calculateScores([...diceValues]);
      return scores[category.name];
    }
    
    return '-';
  };

  const isCategoryAvailable = (category) => {
    return rollCount > 0 && dbScores[category.name] === undefined;
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;

    try {
      const scores = calculateScores([...diceValues]);
      const scoreToSave = scores[category.name];
      await handleScoreCategoryClick(category.name);
      setDbScores(prev => ({
        ...prev,
        [category.name]: scoreToSave
      }));
    } catch (error) {
      console.error('Error handling category click:', error);
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
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={isAvailable ? 'clickable' : ''}
                style={{ cursor: isAvailable ? 'pointer' : 'default' }}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td>{getDisplayScore(category)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);