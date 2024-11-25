import React, { useState, useEffect } from 'react';
import diceOne from '../img/dice-six-faces-one.svg';
import diceTwo from '../img/dice-six-faces-two.svg';
import diceThree from '../img/dice-six-faces-three.svg';
import diceFour from '../img/dice-six-faces-four.svg';
import diceFive from '../img/dice-six-faces-five.svg';
import diceSix from '../img/dice-six-faces-six.svg';
import '../styles/diceGame.css'; // Using diceGame.css for game dice styles

// Array of dice images
const diceImages = [diceOne, diceTwo, diceThree, diceFour, diceFive, diceSix];

function Dice({ value, isSelected, onClick, isRolling }) {
  const [displayValue, setDisplayValue] = useState(value); // The displayed value
  const [isRollingState, setIsRollingState] = useState(isRolling); // State to handle the rolling effect

  // Simulate rolling effect when the roll button is clicked
  useEffect(() => {
    if (isRollingState) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1); // Random dice value between 1 and 6
      }, 100);
      setTimeout(() => {
        clearInterval(interval); // Stop rolling after 1 second
        setIsRollingState(false); // End rolling state
      }, 1000);
    } else {
      setDisplayValue(value); // After rolling stops, display the final dice value
    }
  }, [isRollingState, value]);

  // Handle dice click to toggle selection
  const handleClick = () => {
    onClick(); // This calls the passed onClick function
  };

  return (
    <div
      className={`game-dice ${isSelected ? 'selected' : ''} ${isRollingState ? 'game-dice-rolling' : ''}`} // Add rolling animation when rolling
      onClick={handleClick}
    >
      {/* Render the image based on the dice value */}
      <img src={diceImages[displayValue - 1]} alt={`Dice ${displayValue}`} className="game-dice-image" />
    </div>
  );
}

export default Dice;
