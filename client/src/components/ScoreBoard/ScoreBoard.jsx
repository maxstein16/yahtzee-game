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
            
            return (
              <tr
                key={category.category_id}
                onClick={() => !isAITurn && rollCount > 0 && !category.score && handleScoreCategoryClick(category.name)}
                className={(!isAITurn && rollCount > 0 && !category.score) ? 'clickable' : 'disabled'}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td>{category.score || (rollCount > 0 ? currentScore : '-')}</td>
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