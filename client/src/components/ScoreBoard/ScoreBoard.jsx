import React, { useEffect, useState } from 'react';
import { Typography } from 'antd';
import API from '../../utils/api';
import '../../styles/ScoreBoard.css';

const { Title } = Typography;

const Scoreboard = ({
  currentPlayer,
  mode,
  playerCategories,
  calculateScores,
  diceValues,
  isAITurn,
  rollCount,
  handleScoreCategoryClick,
  aiCategories,
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

    fetchScores();
  }, [currentPlayer?.player_id, gameId]);

  const getDisplayScore = (category) => {
    // First check if there's a saved score
    if (dbScores[category.name] !== null && dbScores[category.name] !== undefined) {
      return dbScores[category.name];
    }
    // If we have dice rolled, show potential score
    if (rollCount > 0) {
      const calculatedScores = calculateScores(diceValues);
      return calculatedScores[category.name];
    }
    return '-';
  };
  
  const isCategoryAvailable = (category) => {
    return !isAITurn && 
           rollCount > 0 && 
           (dbScores[category.name] === null || dbScores[category.name] === undefined);
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) {
      return;
    }

    try {
      // Get the calculated score before saving
      const calculatedScores = calculateScores(diceValues);
      const scoreToSave = calculatedScores[category.name];

      // Call the parent handler to save the score
      await handleScoreCategoryClick(category.name);

      // Immediately update local state to show the saved score
      setDbScores(prev => ({
        ...prev,
        [category.name]: scoreToSave
      }));

      // Fetch updated categories to ensure sync with database
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      const updatedScoreMap = {};
      updatedCategories.forEach(cat => {
        updatedScoreMap[cat.name] = cat.score;
      });
      setDbScores(updatedScoreMap);
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
            {mode === 'singleplayer' && <th>AI</th>}
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
                style={{ 
                  cursor: isAvailable ? 'pointer' : 'default'
                }}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td>{getDisplayScore(category)}</td>
                {mode === 'singleplayer' && (
                  <td>
                    {aiCategories.find(c => c.name === category.name)?.score || '-'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);