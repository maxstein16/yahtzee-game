import React, { useMemo } from 'react';
import { Typography } from 'antd';
import '../../styles/ScoreBoard.css'
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

  console.log('Player Categories:', playerCategories); // Add this to see category structure
  console.log('Calculated Scores:', scores); // Add this to see scores structure

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
            // Use the correct key from category to match scores object
            const currentScore = scores[category.category_name] || scores[category.name];
            const isClickable = !isAITurn && rollCount > 0 && !category.score;
            
            return (
              <tr
                key={category.category_id}
                onClick={() => isClickable && handleScoreCategoryClick(category.category_name || category.name)}
                className={isClickable ? 'clickable' : 'disabled'}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.category_name || category.name}</td>
                <td>{category.score !== null ? category.score : (rollCount > 0 ? currentScore : '-')}</td>
                {mode === 'singleplayer' && (
                  <td>
                    {aiCategories.find(c => c.category_name === category.category_name || c.name === category.name)?.score ?? '-'}
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