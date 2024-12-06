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

  // Only fetch scores initially and when a score is submitted
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
    // If the score is already saved, show it
    if (dbScores[category.name] !== null && dbScores[category.name] !== undefined) {
      return dbScores[category.name];
    }
    
    // If we're in the middle of a turn, show potential score
    if (rollCount > 0) {
      const calculatedScores = calculateScores(diceValues);
      return calculatedScores[category.name];
    }
    
    // Otherwise show dash
    return '-';
  };
  
  const isCategoryAvailable = (category) => {
    // Category is available if:
    // 1. It's not AI's turn
    // 2. We've rolled at least once
    // 3. The category hasn't been used yet
    const hasScore = dbScores[category.name] !== null && dbScores[category.name] !== undefined;
    return !isAITurn && rollCount > 0 && !hasScore;
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;

    try {
      // Get current calculated score
      const calculatedScores = calculateScores(diceValues);
      const scoreToSave = calculatedScores[category.name];

      // Update local state immediately
      setDbScores(prev => ({
        ...prev,
        [category.name]: scoreToSave
      }));

      // Call parent handler to save score
      await handleScoreCategoryClick(category.name);

      // Fetch fresh data to ensure sync
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