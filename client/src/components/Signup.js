import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import '../styles/Signup.css';
import '../styles/Dice.css';

function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    try {
      const res = await fetch('/api/players/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name }),
      });

      if (!res.ok) throw new Error('Signup failed');
      setIsSuccessDialogOpen(true);
    } catch (err) {
      alert('Error signing up. Please try again.');
    }
  };

  // Generate floating dice
  const diceArray = Array.from({ length: 10 }, (_, index) => (
    <div key={index} className="dice"></div>
  ));

  return (
    <div className="signup-page relative">
      <div className="dice-container">{diceArray}</div>
      <div className="signup-container bg-white p-6 rounded-md shadow-md w-full max-w-md mx-auto mt-12">
        <h1 className="text-2xl font-bold text-secondary mb-4 text-center">Sign Up</h1>
        <input
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md"
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md"
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button
          onClick={handleSignup}
          className="w-full px-4 py-2 font-bold text-white bg-secondary rounded-md hover:bg-opacity-90"
        >
          Sign Up
        </button>
      </div>

      {/* Success Dialog */}
      <Dialog.Root open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
            <Dialog.Title className="text-secondary font-bold text-lg mb-2">
              Signup Successful
            </Dialog.Title>
            <Dialog.Description className="text-gray-700 mb-4">
              You can now log in with your new account.
            </Dialog.Description>
            <button
              onClick={() => (window.location.href = '/')}
              className="px-4 py-2 font-bold text-white bg-secondary rounded-md hover:bg-green-500"
            >
              Go to Login
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

export default Signup;
