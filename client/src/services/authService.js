import * as API from '../utils/api';
import { message } from 'antd';

export const handleLogout = (navigate) => {
    localStorage.removeItem('token');
    localStorage.removeItem('playerId');
    navigate('/login');
  };
  
  export const fetchCurrentPlayer = async (navigate) => {
    try {
      const token = localStorage.getItem('token');
      const playerId = localStorage.getItem('playerId');
      
      if (!token || !playerId) {
        navigate('/login');
        return null;
      }
  
      const playerData = await API.getPlayerById(playerId);
      const categories = await API.getPlayerCategories(playerId);
      const total = await API.getPlayerTotalScore(playerId);
  
      return {
        playerData,
        categories,
        total: total.totalScore
      };
    } catch (error) {
      handleLogout(navigate);
      message.error('Session expired. Please login again');
      return null;
    }
  };
