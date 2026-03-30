import { useState } from 'react';
import type { Language } from '../../types/game';
import './CreateGame.css';

interface CreateGameProps {
  onCreateGame: (languages: Language[]) => Promise<{ id: string; code: string } | null>;
  onBack: () => void;
}

export function CreateGame({ onCreateGame, onBack }: CreateGameProps) {
  const [languages, setLanguages] = useState<Set<Language>>(new Set(['en', 'de']));
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);

  const toggleLanguage = (lang: Language) => {
    setLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) {
        if (next.size > 1) next.delete(lang); // must have at least 1
      } else {
        next.add(lang);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    const result = await onCreateGame([...languages]);
    setCreating(false);
    if (result) {
      setJoinCode(result.code);
    }
  };

  return (
    <div className="create-game-container">
      <div className="create-game-card">
        <button className="create-game-back" onClick={onBack}>&larr; Back</button>
        <h2 className="create-game-title">New Game</h2>
        <p className="create-game-subtitle">Choose which languages are valid</p>

        <div className="create-game-languages">
          <label className={`lang-toggle ${languages.has('en') ? 'lang-toggle-active' : ''}`}>
            <input
              type="checkbox"
              checked={languages.has('en')}
              onChange={() => toggleLanguage('en')}
            />
            English
          </label>
          <label className={`lang-toggle ${languages.has('de') ? 'lang-toggle-active' : ''}`}>
            <input
              type="checkbox"
              checked={languages.has('de')}
              onChange={() => toggleLanguage('de')}
            />
            German
          </label>
        </div>

        <p className="create-game-hint">
          Words valid in <strong>any</strong> selected language count!
        </p>

        {!joinCode ? (
          <button
            className="create-game-btn"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Game'}
          </button>
        ) : (
          <div className="create-game-code-area">
            <p className="create-game-code-label">Share this code with your opponent:</p>
            <div className="create-game-code">{joinCode}</div>
            <button
              className="create-game-btn"
              onClick={() => {
                navigator.clipboard?.writeText(joinCode);
              }}
            >
              Copy Code
            </button>
            <p className="create-game-waiting">Waiting for opponent to join...</p>
          </div>
        )}
      </div>
    </div>
  );
}
