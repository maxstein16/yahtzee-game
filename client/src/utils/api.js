const API_BASE_URL = 'https://yahtzee-backend-621359075899.us-east1.run.app/api';

export const login = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/players/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Invalid credentials');
  }

  return response.json();
};

export const register = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/players/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Signup failed');
  }

  return response.json();
};
