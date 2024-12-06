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
  gameId
}) => {
  const [dbScores, setDbScores] = useState({});

  useEffect(() => {
    const fetchScores = async () => {
      if (!currentPlayer?.player_id || !gameId) return;

      try {
        const categories = await API.getPlayerCategories(currentPlayer.player_id);
        const scoreMap = {};
        categories.forEach(cat => {
          scoreMap[cat.name] = cat.score;
        });
        setDbScores(scoreMap);
      } catch (error) {
        console.error('Error fetching scores:', error);
      }
    };

    // Fetch scores initially and after each roll
    fetchScores();
  }, [currentPlayer?.player_id, gameId, rollCount]);

  const getDisplayScore = (category) => {
    // If score is saved in DB, show it
    if (dbScores[category.name] !== null && dbScores[category.name] !== undefined) {
      return dbScores[category.name];
    }
    // If dice are rolled, show potential score
    if (rollCount > 0) {
      const calculatedScores = calculateScores(diceValues);
      return calculatedScores[category.name];
    }
    return '-';
  };

  const isCategoryAvailable = (category) => {
    const hasScore = dbScores[category.name] !== null && dbScores[category.name] !== undefined;
    return rollCount > 0 && !hasScore;
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;

    try {
      const calculatedScores = calculateScores(diceValues);
      const scoreToSave = calculatedScores[category.name];

      // Update local state immediately
      setDbScores(prev => ({
        ...prev,
        [category.name]: scoreToSave
      }));

      // Call parent handler to save score
      await handleScoreCategoryClick(category.name);

      // Fetch updated scores
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      const updatedScoreMap = {};
      updatedCategories.forEach(cat => {
        updatedScoreMap[cat.name] = cat.score;
      });
      setDbScores(updatedScoreMap);

    } catch (error) {
      console.error('Error handling category click:', error);
      // Reset the local state if there was an error
      setDbScores(prev => ({
        ...prev,
        [category.name]: null
      }));
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
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={isAvailable ? 'clickable' : ''}
                style={{ 
                  cursor: isAvailable ? 'pointer' : 'default',
                }}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td>{score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);