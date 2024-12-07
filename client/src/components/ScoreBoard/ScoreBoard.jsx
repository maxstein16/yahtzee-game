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

  const [lockedCategories, setLockedCategories] = useState(() => {
    const initialLocked = {};
    playerCategories.forEach(category => {
      initialLocked[category.name.toLowerCase()] = category.score !== null;
    });
    return initialLocked;
  });

  useEffect(() => {
    const fetchScores = async () => {
      if (currentPlayer?.id) {
        try {
          const categories = await API.getPlayerCategories(currentPlayer.id);
          const scoreMap = {};
          const lockedMap = {};
          categories.forEach(category => {
            const key = category.name.toLowerCase();
            scoreMap[key] = category.score;
            lockedMap[key] = category.score !== null;
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

  const getDisplayScore = (category) => {
    const key = category.name.toLowerCase();
    if (scores[key] !== null) {
      return scores[key] || '0';
    }
    if (diceValues && diceValues.length > 0 && isCategoryAvailable(category)) {
      const currentScores = calculateScores(diceValues);
      return currentScores[key] || '-';
    }
    return '-';
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
      const updatedCategories = await API.getPlayerCategories(currentPlayer.id);
      const scoreMap = {};
      const lockedMap = {};
      updatedCategories.forEach(category => {
        const key = category.name.toLowerCase();
        scoreMap[key] = category.score;
        lockedMap[key] = category.score !== null;
      });
      setScores(scoreMap);
      setLockedCategories(lockedMap);
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
            const key = category.name.toLowerCase();
            const isAvailable = isCategoryAvailable(category);
            const isLocked = lockedCategories[key];
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={isAvailable ? 'clickable' : isLocked ? 'locked' : ''}
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
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{calculateTotal()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);