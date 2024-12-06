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
  const [savedScores, setSavedScores] = useState({});

  // Fetch scores when game is loaded or when categories change
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
      } catch (error) {
        console.error('Error fetching saved scores:', error);
      }
    };

    fetchSavedScores();
  }, [currentPlayer?.player_id, gameId, playerCategories]);

  const getDisplayScore = (category) => {
    // If category has a saved score, show it
    if (category.name in savedScores) {
      return savedScores[category.name];
    }
    
    // Show potential score if dice are rolled
    if (rollCount > 0) {
      const calculatedScores = calculateScores(diceValues);
      return calculatedScores[category.name];
    }
    
    return '-';
  };

  const isCategoryAvailable = (category) => {
    // Category is available if:
    // 1. It hasn't been used yet (no saved score)
    // 2. We've rolled the dice at least once
    return rollCount > 0 && !(category.name in savedScores);
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;

    try {
      const calculatedScores = calculateScores(diceValues);
      const scoreToSave = calculatedScores[category.name];

      // Call parent handler to save score
      await handleScoreCategoryClick(category.name);

      // Update local state with new score
      setSavedScores(prev => ({
        ...prev,
        [category.name]: scoreToSave
      }));

    } catch (error) {
      console.error('Error saving score:', error);
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