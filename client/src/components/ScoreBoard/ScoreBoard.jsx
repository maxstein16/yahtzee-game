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
  const [totalScore, setTotalScore] = useState(0);

  const formatCategoryName = (name) => {
    const specialCases = {
      threeOfAKind: 'Three of a Kind',
      fourOfAKind: 'Four of a Kind',
      fullHouse: 'Full House',
      smallStraight: 'Small Straight',
      largeStraight: 'Large Straight',
      yahtzee: 'Yahtzee',
      ones: 'Ones',
      twos: 'Twos',
      threes: 'Threes',
      fours: 'Fours',
      fives: 'Fives',
      sixes: 'Sixes',
      chance: 'Chance'
    };
    return specialCases[name] || name;
  };

  const loadTotalScore = async () => {
    if (currentPlayer?.player_id) {
      try {
        const { totalScore: newTotal } = await API.getPlayerTotalScore(currentPlayer.player_id);
        setTotalScore(newTotal);
      } catch (error) {
        console.error('Error loading total score:', error);
      }
    }
  };

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
            if (category.is_submitted) {
              scoreMap[key] = category.score;
              lockedMap[key] = true;
            } else {
              scoreMap[key] = '-';
              lockedMap[key] = false;
            }
          });
          
          setScores(scoreMap);
          setLockedCategories(lockedMap);
          await loadTotalScore();
        } catch (error) {
          console.error('Error loading scores:', error);
        }
      }
    };

    loadScores();
  }, [currentPlayer?.player_id]);

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
    console.log('Attempting to submit category:', {
      categoryName: key,
      categoryObject: category,
      currentScore: scores[key],
      isLocked: lockedCategories[key],
      rollCount
    });
  
    if (lockedCategories[key] || rollCount === 0) {
      console.log('Submission blocked:', {
        reason: lockedCategories[key] ? 'Category is locked' : 'No rolls made',
        isLocked: lockedCategories[key],
        rollCount
      });
      return;
    }
  
    try {
      console.log('Setting category as locked:', key);
      setLockedCategories(prev => ({
        ...prev,
        [key]: true
      }));
  
      const currentScore = scores[key];
      console.log('Current score to submit:', {
        category: key,
        score: currentScore
      });
  
      console.log('Calling handleScoreCategoryClick with:', {
        categoryName: key,
        currentScore
      });
      
      // Call the score submission handler
      await handleScoreCategoryClick(key);
  
      console.log('Score submitted successfully, updating local state');
  
      // Update local score state
      setScores(prev => ({
        ...prev,
        [key]: currentScore
      }));
  
      console.log('Fetching updated categories');
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      console.log('Received updated categories:', updatedCategories);
  
      const scoreMap = {};
      const lockedMap = {};
      
      updatedCategories.forEach((cat) => {
        const catKey = cat.name;
        if (cat.score !== null) {
          scoreMap[catKey] = cat.score;
          lockedMap[catKey] = true;
        } else {
          scoreMap[catKey] = '-';
          lockedMap[catKey] = false;
        }
      });
  
      console.log('Setting new states:', {
        scores: scoreMap,
        lockedCategories: lockedMap
      });
  
      setScores(scoreMap);
      setLockedCategories(lockedMap);
  
      console.log('Loading total score');
      await loadTotalScore();
  
      console.log('Completing turn');
      onTurnComplete();
  
    } catch (error) {
      console.error('Error in handleClick:', {
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        category: key,
        score: scores[key],
        playerId: currentPlayer?.player_id
      });
  
      // Reset locked state on error
      setLockedCategories(prev => ({
        ...prev,
        [key]: false
      }));
    }
  };

  const getScoreStyle = (isLocked, isAvailable) => {
    return {
      textAlign: 'center',
      fontWeight: isAvailable ? 'bold' : 'normal',
      color: isLocked ? '#666' : isAvailable ? '#1890ff' : '#000'
    };
  };

  const getRowStyle = (isLocked, isAvailable) => {
    return {
      cursor: isAvailable ? 'pointer' : 'default',
      backgroundColor: isAvailable ? '#f5f5f5' : 'transparent',
      opacity: isLocked ? 0.6 : 1
    };
  };

  return (
    <div className="scoreboard">
      <Title level={4}>Scoreboard</Title>
      <table className="score-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>{currentPlayer?.name || 'Player'}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="section-header">
            <td colSpan="2">Upper Section</td>
          </tr>
          {playerCategories
            .filter(cat => ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].includes(cat.name))
            .map((category) => {
              const key = category.name;
              const isLocked = lockedCategories[key];
              const score = scores[key];
              const isAvailable = !isLocked && rollCount > 0;
              
              return (
                <tr
                  key={category.category_id}
                  onClick={() => handleClick(category)}
                  style={getRowStyle(isLocked, isAvailable)}
                >
                  <td>{formatCategoryName(category.name)}</td>
                  <td style={getScoreStyle(isLocked, isAvailable)}>{score}</td>
                </tr>
              );
            })}

          <tr className="section-header">
            <td colSpan="2">Lower Section</td>
          </tr>
          {playerCategories
            .filter(cat => !['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].includes(cat.name))
            .map((category) => {
              const key = category.name;
              const isLocked = lockedCategories[key];
              const score = scores[key];
              const isAvailable = !isLocked && rollCount > 0;
              
              return (
                <tr
                  key={category.category_id}
                  onClick={() => handleClick(category)}
                  style={getRowStyle(isLocked, isAvailable)}
                >
                  <td>{formatCategoryName(category.name)}</td>
                  <td style={getScoreStyle(isLocked, isAvailable)}>{score}</td>
                </tr>
              );
            })}

          <tr className="total-row">
            <td>Total Score</td>
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
              {totalScore}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);