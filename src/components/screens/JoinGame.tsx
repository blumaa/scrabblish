import { useState } from 'react';
import './JoinGame.css';

interface JoinGameProps {
  onJoinGame: (code: string) => Promise<string | null>;
  onBack: () => void;
  error: string | null;
}

export function JoinGame({ onJoinGame, onBack, error }: JoinGameProps) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (code.length !== 8) return;
    setJoining(true);
    await onJoinGame(code.toUpperCase());
    setJoining(false);
  };

  return (
    <div className="join-game-container">
      <div className="join-game-card">
        <button className="join-game-back" onClick={onBack}>&larr; Back</button>
        <h2 className="join-game-title">Join a Game</h2>
        <p className="join-game-subtitle">Enter the code your opponent shared</p>

        <form onSubmit={handleSubmit} className="join-game-form">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8))}
            placeholder="Enter 8-letter code"
            className="join-game-input"
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
          />

          {error && <p className="join-game-error">{error}</p>}

          <button
            type="submit"
            className="join-game-btn"
            disabled={code.length !== 8 || joining}
          >
            {joining ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}
