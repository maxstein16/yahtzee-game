import * as API from '../utils/api';
import { message } from 'antd';

export const handleLogout = (navigate) => {
    localStorage.removeItem('token');
    localStorage.removeItem('playerId');
    navigate('/login');
};
  
export const fetchCurrentPlayer = async (navigate) => {
    try {
        const playerId = localStorage.getItem('playerId');
        
        if (!playerId) {
            navigate('/login');
            return null;
        }
  
        const playerData = await API.getPlayerById(playerId);
        const categories = await API.getPlayerCategories(playerId);
        const totalResponse = await API.getPlayerTotalScore(playerId);
        
        console.log('Fetched player data:', playerData); // Debug log

        if (!playerData || !playerData.name) {
            throw new Error('Invalid player data received');
        }
  
        return {
            playerData: {
                player_id: playerId,
                name: playerData.name, // Make sure this exists
                username: playerData.username,
                ...playerData
            },
            categories,
            total: totalResponse?.totalScore || 0
        };
    } catch (error) {
        console.error('Error fetching player:', error);
        handleLogout(navigate);
        message.error('Session expired. Please login again');
        return null;
    }
};