import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_BACKEND_URL, {
  query: {
    playerId: localStorage.getItem('playerId'),
    playerName: localStorage.getItem('playerName'),
  },
});

export const connect = () => socket.connect();
export const disconnect = () => socket.disconnect();

export const onUpdatePlayers = (callback) => {
  socket.on('update_players', callback);
};

export const sendGameRequest = (toPlayerId, fromPlayer) => {
  socket.emit('game_request', { toPlayerId, fromPlayer });
};

export const onGameRequest = (callback) => {
  socket.on('game_request', callback);
};

export const sendGameResponse = (accepted, fromPlayer, toPlayerId) => {
  socket.emit('game_response', { accepted, fromPlayer, toPlayerId });
};

export const onGameResponse = (callback) => {
  socket.on('game_response', callback);
};

export const sendMessage = (gameId, message, sender) => {
  socket.emit('chat_message', { gameId, message, sender });
};

export const onMessage = (callback) => {
  socket.on('chat_message', callback);
};

export default socket;
