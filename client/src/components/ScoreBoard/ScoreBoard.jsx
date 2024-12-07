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
  isCurrentTurn, // Add this prop to know when it's the player's turn
}) => {
  const [scores, setScores] = useState({});
  const [lockedCategories, setLockedCategories] = useState({});

  // Fetch scores from the API on mount and when the player changes
  const fetchScores = async () => {
    if (currentPlayer?.id) {
      try {
        const categories = await API.getPlayerCategories(currentPlayer.id);
        const scoreMap = {};
        const lockedMap = {};
        
        // Loop through playerCategories to set initial state
        playerCategories.forEach((category) => {
          const matchingCategory = categories.find(
            (c) => c.name.toLowerCase() === category.name.toLowerCase()
          );
          const key = category.name.toLowerCase();
          if (matchingCategory && matchingCategory.score !== null) {
            scoreMap[key] = matchingCategory.score;
            lockedMap[key] = true;
          } else {
            scoreMap[key] = null;
            lockedMap[key] = false;
          }
        });
        
        setScores(scoreMap);
        setLockedCategories(lockedMap);
      } catch (error) {
        console.error('Error fetching scores:', error);
      }
    }
  };

  // Fetch scores on initial load and player change
  useEffect(() => {
    fetchScores();
  }, [currentPlayer?.id, playerCategories]);

  // Reset unlocked categories when turn starts
  useEffect(() => {
    if (isCurrentTurn) {
      setScores((prevScores) => {
        const newScores = { ...prevScores };
        Object.keys(newScores).forEach((key) => {
          if (!lockedCategories[key]) {
            newScores[key] = null;
          }
        });
        return newScores;
      });
    }
  }, [isCurrentTurn, lockedCategories]);

  // Update calculated scores for unlocked categories when dice are rolled
  useEffect(() => {
    if (isCurrentTurn && diceValues && diceValues.length > 0 && rollCount > 0) {
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
  }, [diceValues, rollCount, calculateScores, lockedCategories, isCurrentTurn]);

  const getDisplayScore = (category) => {
    const key = category.name.toLowerCase();
    if (lockedCategories[key]) {
      return scores[key];
    }
    return scores[key] !== null && scores[key] !== undefined ? scores[key] : '-';
  };

  const isCategoryAvailable = (category) => {
    const key = category.name.toLowerCase();
    return isCurrentTurn && rollCount > 0 && !lockedCategories[key];
  };

  const handleClick = async (category) => {
    const key = category.name.toLowerCase();
    if (!isCategoryAvailable(category)) return;

    try {
      // Immediately lock the category and update UI
      setLockedCategories(prev => ({
        ...prev,
        [key]: true
      }));

      // Save current score before API call
      const currentScore = scores[key];
      setScores(prev => ({
        ...prev,
        [key]: currentScore
      }));

      // Call the handler
      await handleScoreCategoryClick(category.name);
      
      // Refresh scores from API after submission
      await fetchScores();
      
    } catch (error) {
      console.error('Error handling category click:', error);
      // Revert the lock if the API call fails
      setLockedCategories(prev => ({
        ...prev,
        [key]: false
      }));
      
      // Revert the score
      setScores(prev => ({
        ...prev,
        [key]: null
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
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={isLocked ? 'locked' : isAvailable ? 'clickable' : ''}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td style={{ textAlign: 'center' }}>
                  {getDisplayScore(category)}
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