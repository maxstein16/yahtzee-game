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

  // Fetch scores from the API on mount and when the player changes
  useEffect(() => {
    const fetchScores = async () => {
      if (currentPlayer?.id) {
        try {
          const categories = await API.getPlayerCategories(currentPlayer.id);
          const scoreMap = {};
          const lockedMap = {};
          categories.forEach((category) => {
            const key = category.name.toLowerCase();
            scoreMap[key] = category.score;
            lockedMap[key] = category.score !== null; // Mark as locked if score exists
          });
          setScores(scoreMap);
          setLockedCategories(lockedMap);
        } catch (error) {
          console.error('Error fetching scores:', error);
        }
      }
    };

    fetchScores();
  }, [currentPlayer?.id]);

  // Update calculated scores for unlocked categories dynamically
  useEffect(() => {
    if (diceValues && diceValues.length > 0 && rollCount > 0) {
      const calculatedScores = calculateScores(diceValues);
      setScores((prevScores) => {
        const updatedScores = { ...prevScores };
        Object.keys(calculatedScores).forEach((key) => {
          if (!lockedCategories[key]) {
            updatedScores[key] = calculatedScores[key];
          }
        });
        return updatedScores;
      });
    }
  }, [diceValues, rollCount, calculateScores, lockedCategories]);

  const getDisplayScore = (category) => {
    const key = category.name.toLowerCase();
    return scores[key] !== null && scores[key] !== undefined
      ? scores[key]
      : '-';
  };

  const isCategoryAvailable = (category) => {
    const key = category.name.toLowerCase();
    return rollCount > 0 && !lockedCategories[key];
  };

  const handleClick = async (category) => {
    const key = category.name.toLowerCase();
    if (!isCategoryAvailable(category)) return;

    try {
      await handleScoreCategoryClick(category.name);
      
      // Immediately lock the category and update the UI
      setLockedCategories(prev => ({
        ...prev,
        [key]: true
      }));

      // Fetch updated scores from the API
      const updatedCategories = await API.getPlayerCategories(currentPlayer.id);
      const scoreMap = {};
      const lockedMap = {};
      updatedCategories.forEach((cat) => {
        const catKey = cat.name.toLowerCase();
        scoreMap[catKey] = cat.score;
        lockedMap[catKey] = cat.score !== null;
      });

      setScores(scoreMap);
      setLockedCategories(lockedMap);
    } catch (error) {
      console.error('Error handling category click:', error);
      // Revert the lock if the API call fails
      setLockedCategories(prev => ({
        ...prev,
        [key]: false
      }));
    }
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);
  };

  const getCategoryClassName = (category) => {
    const key = category.name.toLowerCase();
    if (lockedCategories[key]) return 'locked';
    if (isCategoryAvailable(category)) return 'clickable';
    return '';
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
          {playerCategories.map((category) => (
            <tr
              key={category.category_id}
              onClick={() => handleClick(category)}
              className={getCategoryClassName(category)}
            >
              <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
              <td style={{ textAlign: 'center' }}>
                {getDisplayScore(category)}
              </td>
            </tr>
          ))}
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