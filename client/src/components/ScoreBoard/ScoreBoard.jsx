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
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [scores, setScores] = useState(() => {
    const initialScores = {};
    playerCategories.forEach(category => {
      initialScores[category.name.toLowerCase()] = category.score;
    });
    return initialScores;
  });

  // Fetch initial scores and selected categories
  useEffect(() => {
    const fetchScores = async () => {
      if (currentPlayer?.id) {
        try {
          const categories = await API.getPlayerCategories(currentPlayer.id);
          const scoreMap = {};
          const selected = new Set();
          categories.forEach(category => {
            scoreMap[category.name.toLowerCase()] = category.score;
            if (category.score !== null) {
              selected.add(category.name.toLowerCase());
            }
          });
          setScores(scoreMap);
          setSelectedCategories(selected);
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
    
    if (selectedCategories.has(categoryKey)) {
      return scores[categoryKey];
    }
    
    if (diceValues && diceValues.length > 0 && rollCount > 0) {
      const possibleScores = calculateScores(diceValues);
      return possibleScores[mappedCategory] || '-';
    }
    
    return '-';
  };

  const isCategoryAvailable = (category) => {
    const categoryKey = category.name.toLowerCase();
    return rollCount > 0 && !selectedCategories.has(categoryKey);
  };

  const handleClick = async (category) => {
    if (!isCategoryAvailable(category)) return;
    
    try {
      // First submit the score
      await handleScoreCategoryClick(category.name);
      
      // Then fetch the updated category to get the actual saved score
      const updatedCategory = await API.getPlayerCategory(currentPlayer.id, category.name);
      
      // Only update UI after we have the confirmed score from the database
      if (updatedCategory) {
        setSelectedCategories(prev => new Set([...prev, category.name.toLowerCase()]));
        setScores(prev => ({
          ...prev,
          [category.name.toLowerCase()]: updatedCategory.score
        }));
      }
      
      // Refresh all categories to ensure everything is in sync
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
            const categoryKey = category.name.toLowerCase();
            const isAvailable = isCategoryAvailable(category);
            const score = getDisplayScore(category);
            const isSelected = selectedCategories.has(categoryKey);
            const isTemporaryScore = isAvailable && diceValues && diceValues.length > 0;
            
            return (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                className={isAvailable ? 'clickable' : ''}
                style={{
                  backgroundColor: isSelected ? '#f5f5f5' : 'inherit',
                  opacity: isSelected ? 0.7 : 1,
                  cursor: isAvailable ? 'pointer' : 'default'
                }}
              >
                <td style={{ textTransform: 'capitalize' }}>{category.name}</td>
                <td 
                  style={{ 
                    textAlign: 'center',
                    color: isSelected ? '#666' : (isTemporaryScore ? '#1890ff' : 'inherit'),
                    fontWeight: (isTemporaryScore && !isSelected) ? 'bold' : 'normal'
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