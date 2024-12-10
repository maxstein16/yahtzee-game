// src/services/gameActions.js

import { message } from 'antd';
import API from '../utils/api';
import { chatService } from './websocketService';
import { calculateScores } from './scoreTurnService';

export function createGameActions({
  gameId,
  currentPlayer,
  gameMode,
  diceValues,
  rollCount,
  hasYahtzee,
  yahtzeeBonus,
  setDiceValues,
  setRollCount,
  setSelectedDice,
  setCurrentScores,
  setIsMyTurn,
  setPlayerCategories,
  updatePlayerScores,
  setOpponentState,
  calculateAllScores
}) {
  return {
    async handleScoreCategoryClick(categoryName) {
      if (!gameId || !currentPlayer?.player_id || !categoryName) {
        message.error('Invalid game state');
        return;
      }

      try {
        const calculatedScores = calculateScores(diceValues);
        const categoryScore = calculatedScores[categoryName];

        // Handle Yahtzee
        if (categoryName === 'yahtzee' && categoryScore === 50) {
          await this.handleYahtzeeScore();
        }

        // Submit score
        await this.submitScore(categoryName, categoryScore);

        // Update state
        await this.updateGameState();

        // Handle turn end
        await this.handleTurnEnd(categoryName, categoryScore);

        message.success(`Scored ${categoryScore} points in ${categoryName}!`);
      } catch (error) {
        console.error('Error submitting score:', error);
        message.error(`Failed to submit score: ${error.message}`);
      }
    },

    async handleDiceRoll() {
      if (rollCount >= 3) {
        message.warning('Maximum rolls reached for this turn.');
        return;
      }

      try {
        const result = await API.rollDice(gameId, {
          playerId: currentPlayer.player_id,
          currentDice: diceValues,
          keepIndices: []
        });

        if (result.success) {
          await this.updateRollState(result);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Roll dice error:', error);
        message.error('Failed to roll dice');
      }
    },

    async handleYahtzeeScore() {
      if (hasYahtzee && this.checkForYahtzeeBonus()) {
        const newBonus = yahtzeeBonus + 100;
        await API.submitYahtzeeBonus(gameId, currentPlayer.player_id, newBonus);
        message.success('Yahtzee Bonus! +100 points');
      }
    },

    async submitScore(categoryName, score) {
      await API.createTurn(
        gameId,
        currentPlayer.player_id,
        diceValues,
        rollCount,
        score,
        false
      );

      await API.submitGameScore(
        gameId,
        currentPlayer.player_id,
        categoryName,
        score
      );
    },

    async updateGameState() {
      const updatedCategories = await API.getPlayerCategories(currentPlayer.player_id);
      setPlayerCategories(updatedCategories);
      
      const scores = calculateAllScores(updatedCategories);
      updatePlayerScores(scores);

      this.resetTurnState();
    },

    async handleTurnEnd(categoryName, score) {
      if (gameMode === 'multiplayer') {
        setIsMyTurn(false);
        chatService.emit('turn_end', {
          gameId,
          playerId: currentPlayer.player_id,
          dice: diceValues,
          category: categoryName,
          score
        });
      } else {
        setOpponentState(prev => ({ ...prev, isOpponentTurn: true }));
      }
    },

    resetTurnState() {
      setDiceValues([1, 1, 1, 1, 1]);
      setRollCount(0);
      setSelectedDice([]);
      setCurrentScores({});
    },

    async updateRollState(result) {
      setDiceValues(result.dice);
      setCurrentScores(calculateScores(result.dice));
      setRollCount(prev => prev + 1);

      if (gameMode === 'multiplayer') {
        chatService.emit('dice_roll', {
          gameId,
          playerId: currentPlayer.player_id,
          dice: result.dice,
          rollCount: rollCount + 1
        });
      }
    },

    checkForYahtzeeBonus() {
      return diceValues.every(value => value === diceValues[0]);
    }
  };
}