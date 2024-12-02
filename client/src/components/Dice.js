import React, { useState, useEffect, useRef } from 'react';
import diceOne from '../img/dice-six-faces-one.svg';
import diceTwo from '../img/dice-six-faces-two.svg';
import diceThree from '../img/dice-six-faces-three.svg';
import diceFour from '../img/dice-six-faces-four.svg';
import diceFive from '../img/dice-six-faces-five.svg';
import diceSix from '../img/dice-six-faces-six.svg';
import '../styles/diceGame.css';

const diceImages = [diceOne, diceTwo, diceThree, diceFour, diceFive, diceSix];

function Dice({ value, isSelected, onClick, isRolling }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isRollingState, setIsRollingState] = useState(isRolling);
  const diceRef = useRef(null);

  useEffect(() => {
    if (isRolling && diceRef.current) {
      setIsRollingState(true);
      const x = Math.random() * 300 - 150;
      const y = Math.random() * 150 - 75;
      const finalX = Math.random() * 200 - 100;
      const finalY = Math.random() * 100 - 50;
      const rotations = Math.floor(Math.random() * 3) + 2;
      
      diceRef.current.style.setProperty('--x-offset', `${x}px`);
      diceRef.current.style.setProperty('--y-offset', `${y}px`);
      diceRef.current.style.setProperty('--final-x', `${finalX}px`);
      diceRef.current.style.setProperty('--final-y', `${finalY}px`);
      diceRef.current.style.setProperty('--rotations', rotations);
    }
  }, [isRolling]);

  useEffect(() => {
    if (isRollingState) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        setIsRollingState(false);
        setDisplayValue(value);
      }, 1000);
    }
  }, [isRollingState, value]);

  return (
    <div
      ref={diceRef}
      className={`game-dice ${isSelected ? 'selected' : ''} ${isRollingState ? 'game-dice-rolling rolling' : ''}`}
      onClick={onClick}
    >
      <img 
        src={diceImages[displayValue - 1]} 
        alt={`Dice ${displayValue}`} 
        className="game-dice-image" 
      />
    </div>
  );
}

export default Dice;