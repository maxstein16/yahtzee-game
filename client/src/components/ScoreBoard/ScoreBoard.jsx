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
  const [lastUpdate, setLastUpdate] = useState(0); // Add a trigger for re-fetching

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
  }, [currentPlayer?.player_id, gameId, rollCount, lastUpdate]); // Add lastUpdate to dependencies

  const getDisplayScore = (category) => {
    // If score is saved in DB, show it
    if (dbScores[category.name] !== null && dbScores[category.name] !== undefined) {
      return dbScores[category.name];
    }
    // If we're mid-turn, show potential score
    if (rollCount > 0) {
      return calculateScores(diceValues)[category.name];
    }
    // Otherwise show dash
    return '-';
  };
  
  const isCategoryAvailable = (category) => {
    return !isAITurn && 
           rollCount > 0 && 
           dbScores[category.name] === null;
  };

  const handleClick = async (category) => {
    console.log('Click attempt:', {
      category: category.name,
      isAITurn,
      rollCount,
      score: getDisplayScore(category)
    });
    
    await handleScoreCategoryClick(category.name);
    setLastUpdate(Date.now()); // Trigger a re-fetch after score is saved
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
                onClick={() => isAvailable && handleClick(category)}
                className={isAvailable ? 'clickable' : 'disabled'}
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