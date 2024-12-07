import React, { useEffect, useState } from 'react';
import { Typography } from 'antd';
import API from '../../utils/api';
import '../../styles/ScoreBoard.css';

const { Title } = Typography;

const Scoreboard = ({
  currentPlayer,
  playerCategories,
  calculateScores,  // Using this prop only
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
    if (diceValues && diceValues.length > 0) {
      console.log('Dice values changed:', diceValues);
      const scores = calculateScores(diceValues);
      console.log('Calculated scores:', scores);
    }
  }, [diceValues, calculateScores]);

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
    console.log('getDisplayScore for category:', category.name);
    
    if (dbScores[category.name] !== undefined) {
      console.log('Using DB score:', dbScores[category.name]);
      return dbScores[category.name];
    }
    
    if (diceValues && diceValues.length > 0) {
      console.log('Current dice values:', diceValues);
      const currentPossibleScores = calculateScores(diceValues);
      console.log('Possible score for', category.name, ':', currentPossibleScores[category.name]);
      return currentPossibleScores[category.name];
    }
    
    console.log('No score available, returning -');
    return '-';
  };
  
  const isCategoryAvailable = (category) => {
    return rollCount > 0 && dbScores[category.name] === undefined;
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;

    try {
      const currentScores = calculateScores([...diceValues]);
      const scoreToSave = currentScores[category.name];
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
      {console.log('playerCategories:', playerCategories)}
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