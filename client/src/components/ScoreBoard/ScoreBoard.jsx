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
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    const fetchScores = async () => {
      if (!currentPlayer?.player_id || !gameId) return;

      try {
        const categories = await API.getPlayerCategories(currentPlayer.player_id);
        console.log('Fetched categories:', categories);
        const scoreMap = {};
        categories.forEach(cat => {
          scoreMap[cat.name] = cat.score;
        });
        console.log('Score map:', scoreMap);
        setDbScores(scoreMap);
      } catch (error) {
        console.error('Error fetching scores:', error);
      }
    };

    fetchScores();
  }, [currentPlayer?.player_id, gameId, rollCount, lastUpdate]);

  const getDisplayScore = (category) => {
    if (dbScores[category.name] !== null && dbScores[category.name] !== undefined) {
      return dbScores[category.name];
    }
    if (rollCount > 0) {
      const calculatedScores = calculateScores(diceValues);
      return calculatedScores[category.name];
    }
    return '-';
  };
  
  const isCategoryAvailable = (category) => {
    const isUsed = dbScores[category.name] !== null && dbScores[category.name] !== undefined;
    console.log(`Category ${category.name}:`, {
      isAITurn,
      rollCount,
      isUsed,
      dbScore: dbScores[category.name]
    });
    return !isAITurn && rollCount > 0 && !isUsed;
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) {
      console.log('Category not available:', category.name);
      return;
    }
    
    console.log('Clicking category:', category.name);
    await handleScoreCategoryClick(category.name);
    setLastUpdate(Date.now());
  };

  console.log('Current state:', {
    isAITurn,
    rollCount,
    dbScores
  });

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
                  cursor: isAvailable ? 'pointer' : 'default',
                  backgroundColor: isAvailable ? 'white' : '#f5f5f5'
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