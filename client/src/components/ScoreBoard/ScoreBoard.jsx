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
  const [submittedCategories, setSubmittedCategories] = useState(() => {
    const submitted = new Set();
    playerCategories.forEach(category => {
      if (category.score !== null) {
        submitted.add(category.name.toLowerCase());
      }
    });
    return submitted;
  });

  const [scores, setScores] = useState(() => {
    const initialScores = {};
    playerCategories.forEach(category => {
      initialScores[category.name.toLowerCase()] = category.score;
    });
    return initialScores;
  });

  useEffect(() => {
    const newScores = {};
    const newSubmitted = new Set();
    
    playerCategories.forEach(category => {
      const categoryKey = category.name.toLowerCase();
      newScores[categoryKey] = category.score;
      if (category.score !== null) {
        newSubmitted.add(categoryKey);
      }
    });
    
    setScores(newScores);
    setSubmittedCategories(newSubmitted);
  }, [playerCategories]);

  const getDisplayScore = (category) => {
    const categoryKey = category.name.toLowerCase();
    const mappedCategory = categoryNameMapping[categoryKey];
    
    // If category has been submitted, show the saved score
    if (submittedCategories.has(categoryKey)) {
      return scores[categoryKey];
    }
    
    // If we have dice values and it's an available move, show possible score
    if (diceValues && diceValues.length > 0) {
      const possibleScores = calculateScores(diceValues);
      return possibleScores[mappedCategory] || '-';
    }
    
    return '-';
  };

  const isCategoryAvailable = (category) => {
    const categoryKey = category.name.toLowerCase();
    return !submittedCategories.has(categoryKey);
  };

  const handleClick = async (category) => {
    if (submittedCategories.has(category.name.toLowerCase())) return;
    if (rollCount === 0) return;
    
    const categoryKey = category.name.toLowerCase();
    
    try {
      setSubmittedCategories(prev => new Set([...prev, categoryKey]));
      
      await handleScoreCategoryClick(category.name);
      
      const updatedCategories = await API.getPlayerCategories(currentPlayer.id);
      
      const newScores = {};
      updatedCategories.forEach(cat => {
        newScores[cat.name.toLowerCase()] = cat.score;
      });
      setScores(newScores);
      
    } catch (error) {
      console.error('Error handling category click:', error);
      setSubmittedCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryKey);
        return newSet;
      });
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
            const categoryKey = category.name.toLowerCase();
            const isSubmitted = submittedCategories.has(categoryKey);
            const isAvailable = !isSubmitted && rollCount > 0;
            const score = getDisplayScore(category);
            const isTemporaryScore = !isSubmitted && diceValues && diceValues.length > 0;
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={isAvailable ? 'clickable' : ''}
                style={{
                  backgroundColor: isSubmitted ? '#f5f5f5' : 'inherit',
                  opacity: isSubmitted ? 0.7 : 1,
                  cursor: isAvailable ? 'pointer' : 'default'
                }}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td 
                  style={{ 
                    textAlign: 'center',
                    color: isSubmitted ? '#666' : (isTemporaryScore ? '#1890ff' : 'inherit'),
                    fontWeight: (isTemporaryScore && !isSubmitted) ? 'bold' : 'normal'
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