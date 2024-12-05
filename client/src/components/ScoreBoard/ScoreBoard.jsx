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
  }, [currentPlayer?.player_id, gameId, rollCount]);

  const getDisplayScore = (category) => {
    if (dbScores[category.name] !== null && dbScores[category.name] !== undefined) {
      return dbScores[category.name];
    }
    return rollCount > 0 ? calculateScores(diceValues)[category.name] : '-';
  };
  
  const isCategoryAvailable = (category) => {
    return !isAITurn && rollCount > 0;
  };

  const handleClick = (category) => {
    console.log('Click attempt:', {
      category: category.name,
      isAITurn,
      rollCount,
      score: getDisplayScore(category)
    });
    handleScoreCategoryClick(category.name);
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
          {playerCategories.map((category) => (
            <tr
              key={category.category_id}
              onClick={() => handleClick(category)}
              className={isCategoryAvailable(category) ? 'clickable' : 'disabled'}
              >
              <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
              <td>{getDisplayScore(category)}</td>
              {mode === 'singleplayer' && (
                <td>
                  {aiCategories.find(c => c.name === category.name)?.score || '-'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);