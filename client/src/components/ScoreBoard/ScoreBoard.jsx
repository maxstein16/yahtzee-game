import React from 'react';
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
            const currentScore = calculateScores(diceValues)[category.name];
            const scoreExists = category.score !== null && category.score !== undefined;
            
            return (
              <tr
                key={category.category_id}
                onClick={() => !isAITurn && rollCount > 0 && !scoreExists && handleScoreCategoryClick(category.name)}
                className={(!isAITurn && rollCount > 0 && !scoreExists) ? 'clickable' : 'disabled'}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td>
                  {scoreExists 
                    ? category.score 
                    : (rollCount > 0 ? currentScore : '-')}
                </td>
                {mode === 'singleplayer' && (
                  <td>
                    {(() => {
                      const aiCategory = aiCategories.find(c => c.name === category.name);
                      return aiCategory && (aiCategory.score !== null && aiCategory.score !== undefined)
                        ? aiCategory.score
                        : '-';
                    })()}
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