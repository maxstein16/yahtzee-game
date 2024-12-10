import { getAvailablePlayers, createGame } from '../utils/api';

const MultiplayerModal = ({ onGameCreated }) => {
  const [availablePlayers, setAvailablePlayers] = useState([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const players = await getAvailablePlayers();
      setAvailablePlayers(players);
    };
    fetchPlayers();
  }, []);

  const handleChallenge = async (opponentId) => {
    const game = await createGame('pending', 0, playerId);
    onGameCreated(game);
  };

  return (
    <div>
      <h2>Challenge a Player</h2>
      <ul>
        {availablePlayers.map((player) => (
          <li key={player.player_id}>
            {player.name}
            <button onClick={() => handleChallenge(player.player_id)}>Challenge</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
