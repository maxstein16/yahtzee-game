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

  // Calculate possible scores whenever dice values change
  useEffect(() => {
    if (diceValues && diceValues.length > 0 && rollCount > 0) {
      const possibleScores = calculateScores(diceValues);
      console.log('Calculated possible scores:', possibleScores); // Debug log
    }
  }, [diceValues, rollCount, calculateScores]);

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
    
    // If category is already scored, show saved score
    if (scores[categoryKey] !== null && scores[categoryKey] !== undefined) {
      return scores[categoryKey];
    }
    
    // If we have dice values and it's an active turn, show possible score
    if (diceValues && diceValues.length > 0 && rollCount > 0) {
      const possibleScores = calculateScores(diceValues);
      console.log(`Trying to get score for ${mappedCategory}:`, possibleScores[mappedCategory]); // Debug log
      return possibleScores[mappedCategory] || '-';
    }
    
    return '-';
  };

  const isCategoryAvailable = (category) => {
    const categoryKey = category.name.toLowerCase();
    const isNotScored = scores[categoryKey] === null || scores[categoryKey] === undefined;
    return rollCount > 0 && isNotScored;
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