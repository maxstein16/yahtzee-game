import React, { useState, useEffect } from 'react';
import { Typography, message, Modal } from 'antd';
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
  onTurnComplete,
  handleNewGame
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

  const checkGameCompletion = async (updatedLockedCategories) => {
    const allCategoriesSubmitted = Object.values(updatedLockedCategories).every(isLocked => isLocked);
    
    if (allCategoriesSubmitted) {
      try {
        // Get the active game
        const activeGame = await API.getActiveGameForPlayer(currentPlayer.player_id);
        if (activeGame && activeGame.game_id) {
          // End the game
          await API.endGame(activeGame.game_id);
          
          // Show completion modal
          Modal.success({
            title: 'Game Complete!',
            content: `Congratulations! You've completed the game with a total score of ${totalScore} points!`,
            okText: 'OK'
          });
        }
      } catch (error) {
        console.error('Error ending game:', error);
        message.error('Failed to end game properly');
      }
    }
  };

  const handleClick = async (category) => {
    const key = category.name;
    if (lockedCategories[key] || rollCount === 0) return;

    try {
      const updatedLockedCategories = {
        ...lockedCategories,
        [key]: true
      };
      setLockedCategories(updatedLockedCategories);

      const currentScore = scores[key];
      await handleScoreCategoryClick(category.name);

      setScores(prev => ({
        ...prev,
        [key]: currentScore
      }));

      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      const scoreMap = {};
      const lockedMap = {};
      
      updatedCategories.forEach((cat) => {
        const catKey = cat.name;
        if (cat.is_submitted) {
          scoreMap[catKey] = cat.score;
          lockedMap[catKey] = true;
        } else {
          scoreMap[catKey] = '-';
          lockedMap[catKey] = false;
        }
      });

      setScores(scoreMap);
      setLockedCategories(lockedMap);
      await loadTotalScore();

      // Check if this was the last category
      await checkGameCompletion(lockedMap);

      onTurnComplete();
    } catch (error) {
      console.error('Error submitting score:', error);
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