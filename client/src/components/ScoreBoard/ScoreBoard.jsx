import React, { useState, useEffect } from 'react';
import { Typography } from 'antd';
import API from '../../utils/api';
import '../../styles/ScoreBoard.css';

const { Title } = Typography;

const categoryNameMapping = {
  'ones': 'ones',
  'twos': 'twos',
  'threes': 'threes',
  'fours': 'fours',
  'fives': 'fives',
  'sixes': 'sixes',
  'three of a kind': 'threeOfAKind',
  'four of a kind': 'fourOfAKind',
  'full house': 'fullHouse',
  'small straight': 'smallStraight',
  'large straight': 'largeStraight',
  'yahtzee': 'yahtzee',
  'chance': 'chance'
};

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
    const categoryKey = category.name.toLowerCase();
    const mappedCategory = categoryNameMapping[categoryKey];
    
    // If category has a submitted score, show it
    if (scores[categoryKey] !== null && scores[categoryKey] !== undefined) {
      return scores[categoryKey];
    }
    
    // If we have dice values and it's an available move, show possible score
    if (diceValues && diceValues.length > 0 && rollCount > 0) {
      const possibleScores = calculateScores(diceValues);
      return possibleScores[mappedCategory] || '-';
    }
    
    return '-';
  };

  const isCategoryAvailable = (category) => {
    const categoryKey = category.name.toLowerCase();
    const hasNoScore = scores[categoryKey] === null || scores[categoryKey] === undefined;
    return rollCount > 0 && hasNoScore;
  };

  const isScoreSubmitted = (category) => {
    const categoryKey = category.name.toLowerCase();
    return scores[categoryKey] !== null && scores[categoryKey] !== undefined;
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;
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
    return Object.values(scores)
      .filter(score => score !== null && score !== undefined)
      .reduce((sum, score) => sum + (score || 0), 0);
  };

  const getCategoryStyle = (category, isAvailable, isTemporaryScore) => {
    const submitted = isScoreSubmitted(category);
    
    return {
      cursor: isAvailable ? 'pointer' : 'default',
      backgroundColor: submitted ? '#f5f5f5' : 'inherit',
      opacity: submitted ? 0.7 : 1,
    };
  };

  const getScoreStyle = (isAvailable, isTemporaryScore, submitted) => {
    return {
      textAlign: 'center',
      color: submitted ? '#666' : (isTemporaryScore ? '#1890ff' : 'inherit'),
      fontWeight: isTemporaryScore && !submitted ? 'bold' : 'normal',
    };
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
            const submitted = isScoreSubmitted(category);
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={isAvailable ? 'clickable' : ''}
                style={getCategoryStyle(category, isAvailable, isTemporaryScore)}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td style={getScoreStyle(isAvailable, isTemporaryScore, submitted)}>
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