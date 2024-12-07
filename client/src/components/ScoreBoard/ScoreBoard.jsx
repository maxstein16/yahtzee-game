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
  const [scores, setScores] = useState({});
  const [lockedCategories, setLockedCategories] = useState({});

  useEffect(() => {
    const loadScores = async () => {
      if (currentPlayer?.id) {
        try {
          const categories = await API.getPlayerCategories(currentPlayer.id);
          console.log('Loaded categories:', categories);
          
          const scoreMap = {};
          const lockedMap = {};
          
          categories.forEach((category) => {
            const key = category.name.toLowerCase();
            scoreMap[key] = category.score;
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

  const getDisplayScore = (category) => {
    const key = category.name.toLowerCase();
    return scores[key] !== null && scores[key] !== undefined ? scores[key] : '-';
  };

  const isCategoryAvailable = (category) => {
    const key = category.name.toLowerCase();
    return rollCount > 0 && !lockedCategories[key];
  };

  const handleClick = async (category) => {
    const key = category.name.toLowerCase();
    if (!isCategoryAvailable(category)) return;

    try {
      setLockedCategories(prev => ({
        ...prev,
        [key]: true
      }));

      await handleScoreCategoryClick(category.name);

      const updatedCategories = await API.getPlayerCategories(currentPlayer.id);
      const scoreMap = { ...scores };
      const lockedMap = { ...lockedCategories };
      
      updatedCategories.forEach((cat) => {
        const catKey = cat.name.toLowerCase();
        scoreMap[catKey] = cat.score !== null ? cat.score : scoreMap[catKey];
        lockedMap[catKey] = cat.score !== null;
      });

      setScores(scoreMap);
      setLockedCategories(lockedMap);
    } catch (error) {
      console.error('Error submitting score:', error);
      setLockedCategories(prev => ({
        ...prev,
        [key]: false
      }));
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
            const key = category.name.toLowerCase();
            const isLocked = lockedCategories[key];
            const isAvailable = isCategoryAvailable(category);
            const score = getDisplayScore(category);
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={`${isLocked ? 'locked' : ''} ${isAvailable ? 'clickable' : ''}`}
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