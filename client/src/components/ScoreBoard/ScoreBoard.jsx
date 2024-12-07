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

  const formatCategoryName = (name) => {
    const specialCases = {
      threeOfAKind: 'Three of a Kind',
      fourOfAKind: 'Four of a Kind',
      fullHouse: 'Full House',
      smallStraight: 'Small Straight',
      largeStraight: 'Large Straight',
    };

    return specialCases[name] || name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Load initial scores
  useEffect(() => {
    const loadScores = async () => {
      if (currentPlayer?.player_id) {
        try {
          const categories = await API.getPlayerCategories(currentPlayer.player_id);
          console.log('Loaded categories:', categories);
          
          const scoreMap = {};
          const lockedMap = {};
          
          categories.forEach((category) => {
            const key = category.name;
            if (category.score !== null) {
              scoreMap[key] = category.score;
              // Only lock categories that have been submitted (have a non-null score)
              lockedMap[key] = true;
            } else {
              scoreMap[key] = '-';
              lockedMap[key] = false;
            }
          });
          
          setScores(scoreMap);
          setLockedCategories(lockedMap);
        } catch (error) {
          console.error('Error loading scores:', error);
        }
      }
    };

    loadScores();
  }, [currentPlayer?.player_id]);

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
    const key = category.name;
    if (lockedCategories[key] || rollCount === 0) return;

    try {
      setLockedCategories(prev => ({
        ...prev,
        [key]: true
      }));

      const currentScore = scores[key];
      await handleScoreCategoryClick(category.name);

      setScores(prev => ({
        ...prev,
        [key]: currentScore
      }));

      onTurnComplete();

    } catch (error) {
      console.error('Error submitting score:', error);
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
            const key = category.name;
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
                  cursor: isAvailable ? 'pointer' : 'default',
                }}
              >
                <td>{formatCategoryName(category.name)}</td>
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