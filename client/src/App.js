import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Signup from './components/Signup';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game/:id" element={<Game />} />
      </Routes>
    </Router>
  );
}

export default App;
