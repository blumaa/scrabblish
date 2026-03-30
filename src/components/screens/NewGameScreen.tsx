import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { BackButton } from '../atoms/BackButton';
import type { Language } from '../../types/game';
import './NewGameScreen.css';

interface NewGameScreenProps {
  friendName: string;
  onCreateGame: (languages: Language[]) => Promise<void>;
  onBack: () => void;
}

export function NewGameScreen({ friendName, onCreateGame, onBack }: NewGameScreenProps) {
  const [languages, setLanguages] = useState<Set<Language>>(new Set(['en', 'de']));
  const [creating, setCreating] = useState(false);

  const toggleLang = (lang: Language) => {
    setLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) {
        if (next.size > 1) next.delete(lang);
      } else {
        next.add(lang);
      }
      return next;
    });
  };

  return (
    <div className="new-game-container">
      <Card padding="lg">
        <BackButton onClick={onBack} />
        <h2 className="new-game-title">New Game with @{friendName}</h2>
        <p className="new-game-subtitle">Choose which languages are valid</p>

        <div className="new-game-languages">
          {(['en', 'de'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => toggleLang(lang)}
              className={`new-game-lang ${languages.has(lang) ? 'new-game-lang--active' : ''}`}
            >
              {lang === 'en' ? 'English' : 'German'}
            </button>
          ))}
        </div>

        <Button
          className="new-game-start"
          onClick={async () => {
            setCreating(true);
            await onCreateGame([...languages]);
            setCreating(false);
          }}
          disabled={creating}
        >
          {creating ? 'Creating...' : 'Start Game'}
        </Button>
      </Card>
    </div>
  );
}
