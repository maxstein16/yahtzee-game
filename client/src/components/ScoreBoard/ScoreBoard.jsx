import React from 'react';
import { Typography } from 'antd';
import '../../styles/ScoreBoard.css';

const { Title } = Typography;

const Scoreboard = ({
  currentPlayer,
  playerCategories,
  calculateScores,
  diceValues,
  rollCount,
  handleScoreCategoryClick,
}) => {
  const getDisplayScore = (category) => {
    if (diceValues && diceValues.length > 0) {
      const currentScores = calculateScores(diceValues);
      return currentScores[category.name.toLowerCase()] || '-';
    }
    return '-';
  };

  const isCategoryAvailable = (category) => {
    return rollCount > 0;
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;
    try {
      await handleScoreCategoryClick(category.name);
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