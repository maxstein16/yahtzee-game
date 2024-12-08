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
  gameId
}) => {
  const [scores, setScores] = useState({});
  const [lockedCategories, setLockedCategories] = useState({});
  const [totalScore, setTotalScore] = useState(0);
  const [upperSectionScore, setUpperSectionScore] = useState(0);
  const [lowerSectionScore, setLowerSectionScore] = useState(0);
  const [yahtzeeBonus, setYahtzeeBonus] = useState(0);
  const [hasYahtzee, setHasYahtzee] = useState(false);

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

  const calculateSectionScores = (categories, scoreValues) => {
    const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
    let upperTotal = 0;
    let lowerTotal = 0;

    categories.forEach(category => {
      const score = scoreValues[category.name];
      if (score !== '-') {
        if (upperCategories.includes(category.name)) {
          upperTotal += Number(score);
        } else {
          lowerTotal += Number(score);
        }
      }
    });

    // Add upper section bonus if applicable
    const upperBonus = upperTotal >= 63 ? 35 : 0;
    upperTotal += upperBonus;

    // Add Yahtzee bonus to lower section
    lowerTotal += yahtzeeBonus;

    return {
      upperTotal,
      lowerTotal,
      upperBonus
    };
  };

  const loadTotalScore = async () => {
    if (currentPlayer?.player_id) {
      try {
        const { totalScore: newTotal } = await API.getPlayerTotalScore(currentPlayer.player_id);
        
        // Calculate section totals
        const sectionTotals = calculateSectionScores(playerCategories, scores);
        setUpperSectionScore(sectionTotals.upperTotal);
        setLowerSectionScore(sectionTotals.lowerTotal);
        setTotalScore(sectionTotals.upperTotal + sectionTotals.lowerTotal);
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
            scoreMap[key] = category.is_submitted ? category.score : '-';
            lockedMap[key] = category.is_submitted;
            
            if (key === 'yahtzee' && category.is_submitted && category.score === 50) {
              setHasYahtzee(true);
            }
          });
          
          setScores(scoreMap);
          setLockedCategories(lockedMap);
          
          // Calculate initial section totals
          const sectionTotals = calculateSectionScores(categories, scoreMap);
          setUpperSectionScore(sectionTotals.upperTotal);
          setLowerSectionScore(sectionTotals.lowerTotal);
          setTotalScore(sectionTotals.upperTotal + sectionTotals.lowerTotal);
        } catch (error) {
          console.error('Error loading scores:', error);
        }
      }
    };
  
    loadScores();
  }, [currentPlayer?.player_id, gameId]);

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
        const activeGame = await API.getActiveGameForPlayer(currentPlayer.player_id);
        if (activeGame && activeGame.game_id) {
          await API.endGame(activeGame.game_id);
          
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

  const checkForYahtzeeBonus = (diceValues) => {
    if (!hasYahtzee) return false;
    return diceValues.every(value => value === diceValues[0]);
  };

  const handleClick = async (category) => {
    const key = category.name;
    if (lockedCategories[key] || rollCount === 0) return;

    try {
      // Check for Yahtzee bonus
      if (key === 'yahtzee' && checkForYahtzeeBonus(diceValues)) {
        setYahtzeeBonus(prevBonus => prevBonus + 100);
        message.success('Yahtzee Bonus! +100 points');
      }

      const updatedLockedCategories = {
        ...lockedCategories,
        [key]: true
      };
      setLockedCategories(updatedLockedCategories);

      const currentScore = scores[key];
      await handleScoreCategoryClick(category.name);

      // Update scores and recalculate totals
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      const scoreMap = {};
      const lockedMap = {};
      
      updatedCategories.forEach((cat) => {
        const catKey = cat.name;
        if (cat.is_submitted) {
          scoreMap[catKey] = cat.score;
          lockedMap[catKey] = true;
          
          if (catKey === 'yahtzee' && cat.score === 50) {
            setHasYahtzee(true);
          }
        } else {
          scoreMap[catKey] = '-';
          lockedMap[catKey] = false;
        }
      });

      setScores(scoreMap);
      setLockedCategories(lockedMap);

      // Recalculate section totals
      const sectionTotals = calculateSectionScores(updatedCategories, scoreMap);
      setUpperSectionScore(sectionTotals.upperTotal);
      setLowerSectionScore(sectionTotals.lowerTotal);
      setTotalScore(sectionTotals.upperTotal + sectionTotals.lowerTotal);

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

  const getBonusStyle = (isEligible) => {
    return {
      backgroundColor: isEligible ? '#f6ffed' : 'transparent',
      color: isEligible ? '#52c41a' : '#666',
      fontWeight: isEligible ? 'bold' : 'normal',
      textAlign: 'center'
    };
  };

  const getSectionTotalStyle = () => {
    return {
      backgroundColor: '#fafafa',
      fontWeight: 'bold',
      textAlign: 'center',
      borderTop: '2px solid #d9d9d9'
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

          <tr className="bonus-row">
            <td>Upper Section Bonus (≥63)</td>
            <td style={getBonusStyle(upperSectionScore >= 63)}>
              {upperSectionScore >= 63 ? '35' : '0'}
            </td>
          </tr>

          <tr className="section-total">
            <td>Upper Section Total</td>
            <td style={getSectionTotalStyle()}>{upperSectionScore}</td>
          </tr>

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

          {yahtzeeBonus > 0 && (
            <tr className="bonus-row">
              <td>Yahtzee Bonus</td>
              <td style={getBonusStyle(true)}>{yahtzeeBonus}</td>
            </tr>
          )}

          <tr className="section-total">
            <td>Lower Section Total</td>
            <td style={getSectionTotalStyle()}>{lowerSectionScore}</td>
          </tr>

          <tr className="grand-total">
            <td>Grand Total</td>
            <td style={{
              ...getSectionTotalStyle(),
              backgroundColor: '#e6f7ff',
              color: '#1890ff',
              fontSize: '1.1em'
            }}>
              {totalScore}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(Scoreboard);