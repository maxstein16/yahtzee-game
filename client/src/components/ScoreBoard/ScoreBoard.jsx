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
  gameId,
  isOpponent = false
}) => {
  const [scores, setScores] = useState({});
  const [lockedCategories, setLockedCategories] = useState({});
  const [totalScore, setTotalScore] = useState(0);
  const [upperSectionScore, setUpperSectionScore] = useState(0);
  const [lowerSectionScore, setLowerSectionScore] = useState(0);
  const [upperSectionBaseScore, setUpperSectionBaseScore] = useState(0);
  const [lowerSectionBaseScore, setLowerSectionBaseScore] = useState(0);
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
    let upperBase = 0;
    let lowerBase = 0;

    categories.forEach(category => {
      const score = scoreValues[category.name];
      if (score !== '-') {
        if (upperCategories.includes(category.name)) {
          upperBase += Number(score);
        } else if (category.name !== 'yahtzeeBonus') {
          lowerBase += Number(score);
        }
      }
    });

    const upperBonus = upperBase >= 63 ? 35 : 0;
    const upperTotal = upperBase + upperBonus;
    const lowerTotal = lowerBase + yahtzeeBonus;

    return {
      upperBase,
      lowerBase,
      upperTotal,
      lowerTotal,
      upperBonus
    };
  };

  // Load scores when component mounts or when categories change
  useEffect(() => {
    const loadScores = async () => {
      if (currentPlayer?.player_id) {
        try {
          const categories = await API.getPlayerCategories(currentPlayer.player_id);
          
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
          
          const sectionTotals = calculateSectionScores(categories, scoreMap);
          setUpperSectionBaseScore(sectionTotals.upperBase);
          setLowerSectionBaseScore(sectionTotals.lowerBase);
          setUpperSectionScore(sectionTotals.upperTotal);
          setLowerSectionScore(sectionTotals.lowerTotal);
          setTotalScore(sectionTotals.upperTotal + sectionTotals.lowerTotal);
        } catch (error) {
          console.error('Error loading scores:', error);
        }
      }
    };
  
    loadScores();
  }, [currentPlayer?.player_id, gameId, playerCategories]);

  useEffect(() => {
    if (!isOpponent && diceValues && diceValues.length > 0 && rollCount > 0) {
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
  }, [diceValues, rollCount, calculateScores, lockedCategories, isOpponent]);

  const handleClick = async (category) => {
    if (isOpponent) return; // Prevent clicking on opponent's scoreboard
    
    const key = category.name;
    if (lockedCategories[key] || rollCount === 0) return;

    try {
      if (key === 'yahtzee' && hasYahtzee && diceValues.every(val => val === diceValues[0])) {
        setYahtzeeBonus(prevBonus => prevBonus + 100);
        message.success('Yahtzee Bonus! +100 points');
      }

      await handleScoreCategoryClick(category.name);

      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      const scoreMap = {};
      const lockedMap = {};
      
      updatedCategories.forEach((cat) => {
        const catKey = cat.name;
        scoreMap[catKey] = cat.is_submitted ? cat.score : '-';
        lockedMap[catKey] = cat.is_submitted;
      });

      setScores(scoreMap);
      setLockedCategories(lockedMap);

      const sectionTotals = calculateSectionScores(updatedCategories, scoreMap);
      setUpperSectionBaseScore(sectionTotals.upperBase);
      setLowerSectionBaseScore(sectionTotals.lowerBase);
      setUpperSectionScore(sectionTotals.upperTotal);
      setLowerSectionScore(sectionTotals.lowerTotal);
      setTotalScore(sectionTotals.upperTotal + sectionTotals.lowerTotal);

      // Check for game completion
      if (Object.values(lockedMap).every(isLocked => isLocked)) {
        Modal.success({
          title: 'Game Complete!',
          content: `Final Score: ${sectionTotals.upperTotal + sectionTotals.lowerTotal}`,
        });
      }

      onTurnComplete();
    } catch (error) {
      console.error('Error submitting score:', error);
      message.error('Failed to submit score');
    }
  };

  const getRowStyle = (category, isLocked) => {
    const isAvailable = !isLocked && rollCount > 0 && !isOpponent;
    return {
      cursor: isAvailable ? 'pointer' : 'default',
      backgroundColor: isAvailable ? '#f5f5f5' : 'transparent',
      opacity: isLocked ? 0.8 : 1,
      transition: 'all 0.3s ease'
    };
  };

  const getScoreStyle = (isLocked, score) => {
    return {
      textAlign: 'center',
      fontWeight: isLocked ? 'normal' : 'bold',
      color: isLocked ? '#666' : score === '-' ? '#999' : '#1890ff'
    };
  };

  return (
    <div className="scoreboard">
      <Title level={4}>{isOpponent ? 'Opponent Score' : 'Your Score'}</Title>
      <table className="score-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>{currentPlayer?.name || 'Player'}</th>
          </tr>
        </thead>
        <tbody>
          {/* Upper Section */}
          <tr className="section-header">
            <td colSpan="2">Upper Section</td>
          </tr>
          {playerCategories
            .filter(cat => ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].includes(cat.name))
            .map((category) => (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                style={getRowStyle(category, lockedCategories[category.name])}
              >
                <td>{formatCategoryName(category.name)}</td>
                <td style={getScoreStyle(lockedCategories[category.name], scores[category.name])}>
                  {scores[category.name] || '-'}
                </td>
              </tr>
            ))}

          <tr className="subtotal-row">
            <td>Upper Score</td>
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{upperSectionBaseScore}</td>
          </tr>
          <tr className="bonus-row">
            <td>Bonus (≥63)</td>
            <td style={{ 
              textAlign: 'center',
              color: upperSectionBaseScore >= 63 ? '#52c41a' : '#666',
              fontWeight: upperSectionBaseScore >= 63 ? 'bold' : 'normal'
            }}>
              {upperSectionBaseScore >= 63 ? '35' : '0'}
            </td>
          </tr>

          {/* Lower Section */}
          <tr className="section-header">
            <td colSpan="2">Lower Section</td>
          </tr>
          {playerCategories
            .filter(cat => !['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].includes(cat.name))
            .map((category) => (
              <tr
                key={category.category_id}
                onClick={() => handleClick(category)}
                style={getRowStyle(category, lockedCategories[category.name])}
              >
                <td>{formatCategoryName(category.name)}</td>
                <td style={getScoreStyle(lockedCategories[category.name], scores[category.name])}>
                  {scores[category.name] || '-'}
                </td>
              </tr>
            ))}

          {yahtzeeBonus > 0 && (
            <tr className="bonus-row">
              <td>Yahtzee Bonus</td>
              <td style={{ textAlign: 'center', color: '#52c41a', fontWeight: 'bold' }}>
                {yahtzeeBonus}
              </td>
            </tr>
          )}

          {/* Totals */}
          <tr className="section-total">
            <td>Upper Total</td>
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{upperSectionScore}</td>
          </tr>
          <tr className="section-total">
            <td>Lower Total</td>
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{lowerSectionScore}</td>
          </tr>
          <tr className="grand-total">
            <td>Grand Total</td>
            <td style={{ 
              textAlign: 'center', 
              fontWeight: 'bold',
              fontSize: '1.1em',
              color: '#1890ff',
              backgroundColor: '#e6f7ff'
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