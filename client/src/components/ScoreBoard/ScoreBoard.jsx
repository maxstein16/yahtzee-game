import React, { useMemo } from 'react';
import { Typography } from 'antd';
import '../../styles/Scoreboard.css'
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
  aiCategories
}) => {
  const scores = useMemo(() => {
    if (!diceValues || diceValues.length === 0) return {};
    return calculateScores(diceValues);
  }, [diceValues, calculateScores]);

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
            const currentScore = scores[category.name];
            const isClickable = !isAITurn && rollCount > 0 && !category.score;
            
            return (
              <tr
                key={category.category_id}
                onClick={() => isClickable && handleScoreCategoryClick(category.name)}
                className={isClickable ? 'clickable' : 'disabled'}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td>{category.score !== null ? category.score : (rollCount > 0 ? currentScore : '-')}</td>
                {mode === 'singleplayer' && (
                  <td>
                    {aiCategories.find(c => c.name === category.name)?.score ?? '-'}
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