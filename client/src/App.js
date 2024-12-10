import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login'
import Signup from './pages/Signup';
import Lobby from './pages/Lobby/Lobby';
import MultiplayerPage from './pages/Multiplayer';
import SingleplayerPage from './pages/Singleplayer';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const playerId = localStorage.getItem('playerId');
  
  if (!token || !playerId) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/multiplayer"
          element={
            <ProtectedRoute>
              <MultiplayerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/singleplayer"
          element={
            <ProtectedRoute>
              <SingleplayerPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;