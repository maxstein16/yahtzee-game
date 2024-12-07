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
  onTurnComplete
}) => {
  const [scores, setScores] = useState({});
  const [lockedCategories, setLockedCategories] = useState({});

  // Load initial scores
  useEffect(() => {
    const loadScores = async () => {
      if (currentPlayer?.id) {
        try {
          const categories = await API.getPlayerCategories(currentPlayer.id);
          
          const scoreMap = {};
          const lockedMap = {};
          
          categories.forEach((category) => {
            const key = category.name.toLowerCase();
            scoreMap[key] = category.score !== null ? category.score : '-';
            lockedMap[key] = category.score !== null;
          });
          
          setScores(scoreMap);
          setLockedCategories(lockedMap);
        } catch (error) {
          console.error('Error loading scores:', error);
        }
      }
    };

    loadScores();
  }, [currentPlayer?.id]);

  // Reset possible scores when turn starts
  useEffect(() => {
    if (rollCount === 0) {
      setScores(prevScores => {
        const newScores = { ...prevScores };
        Object.keys(newScores).forEach(key => {
          if (!lockedCategories[key]) {
            newScores[key] = '-';
          }
        });
        return newScores;
      });
    }
  }, [rollCount, lockedCategories]);

  // Update available scores when dice are rolled
  useEffect(() => {
    if (diceValues && diceValues.length > 0 && rollCount > 0) {
      const calculatedScores = calculateScores(diceValues);
      setScores(prevScores => {
        const newScores = { ...prevScores };
        Object.keys(calculatedScores).forEach(key => {
          if (!lockedCategories[key]) {
            newScores[key] = calculatedScores[key];
          }
        });
        return newScores;
      });
    }
  }, [diceValues, rollCount, calculateScores, lockedCategories]);

  const handleClick = async (category) => {
    const key = category.name.toLowerCase();
    if (lockedCategories[key] || rollCount === 0) return;

    try {
      // Lock the category immediately
      setLockedCategories(prev => ({
        ...prev,
        [key]: true
      }));

      // Store the current score before submission
      const currentScore = scores[key];

      // Submit the score
      await handleScoreCategoryClick(category.name);

      // Update the scores state to keep the submitted score visible
      setScores(prev => ({
        ...prev,
        [key]: currentScore
      }));

      // Notify parent that turn is complete to reset dice and roll count
      onTurnComplete();

    } catch (error) {
      console.error('Error submitting score:', error);
      // Unlock the category if there was an error
      setLockedCategories(prev => ({
        ...prev,
        [key]: false
      }));
    }
  };

  const calculateTotal = () => {
    return Object.values(scores)
      .filter(score => typeof score === 'number')
      .reduce((sum, score) => sum + score, 0);
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
            const key = category.name.toLowerCase();
            const isLocked = lockedCategories[key];
            const score = scores[key];
            const isAvailable = !isLocked && rollCount > 0;
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={`
                  ${isLocked ? 'locked' : ''} 
                  ${isAvailable ? 'clickable' : ''}
                `}
                style={{
                  opacity: isLocked ? 0.6 : 1,
                  cursor: isAvailable ? 'pointer' : 'default'
                }}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td style={{ textAlign: 'center' }}>
                  {score}
                </td>
              </tr>
            );
          })}
          <tr className="total-row">
            <td style={{ fontWeight: 'bold' }}>Total</td>
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
              {calculateTotal()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);