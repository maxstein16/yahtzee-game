import React, { useState, useEffect } from 'react';
import { Typography } from 'antd';
import API from '../../utils/api';
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
  const [scores, setScores] = useState(() => {
    const initialScores = {};
    playerCategories.forEach(category => {
      initialScores[category.name.toLowerCase()] = category.score;
    });
    return initialScores;
  });

  useEffect(() => {
    const fetchScores = async () => {
      if (currentPlayer?.id) {
        try {
          const categories = await API.getPlayerCategories(currentPlayer.id);
          const scoreMap = {};
          categories.forEach(category => {
            scoreMap[category.name.toLowerCase()] = category.score;
          });
          setScores(scoreMap);
        } catch (error) {
          console.error('Error fetching scores:', error);
        }
      }
    };

    fetchScores();
  }, [currentPlayer?.id]);

  const getDisplayScore = (category) => {
    const categoryName = category.name.toLowerCase();
    
    // If the category is already scored, show the saved score
    if (scores[categoryName] !== null) {
      return scores[categoryName] || '0';
    }
    
    // If we have dice values and it's an available move, calculate and show possible score
    if (diceValues && diceValues.length > 0 && rollCount > 0) {
      const possibleScores = calculateScores(diceValues);
      if (possibleScores.hasOwnProperty(categoryName)) {
        return possibleScores[categoryName];
      }
    }
    
    return '-';
  };

  const isCategoryAvailable = (category) => {
    const categoryName = category.name.toLowerCase();
    return rollCount > 0 && scores[categoryName] === null;
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;
    
    // Get the possible score before submitting
    const possibleScore = getDisplayScore(category);
    
    try {
      await handleScoreCategoryClick(category.name);
      const updatedCategories = await API.getPlayerCategories(currentPlayer.id);
      const scoreMap = {};
      updatedCategories.forEach(category => {
        scoreMap[category.name.toLowerCase()] = category.score;
      });
      setScores(scoreMap);
    } catch (error) {
      console.error('Error handling category click:', error);
    }
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);
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
            const score = getDisplayScore(category);
            const isTemporaryScore = isAvailable && diceValues && diceValues.length > 0;
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={isAvailable ? 'clickable' : ''}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td 
                  style={{ 
                    textAlign: 'center',
                    color: isTemporaryScore ? '#1890ff' : 'inherit',
                    fontWeight: isTemporaryScore ? 'bold' : 'normal'
                  }}
                >
                  {score}
                </td>
              </tr>
            );
          })}
          <tr className="total-row">
            <td style={{ fontWeight: 'bold' }}>Total</td>
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{calculateTotal()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);