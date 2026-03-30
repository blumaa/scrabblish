import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { BackButton } from '../atoms/BackButton';
import { Spinner } from '../atoms/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useGameManager } from '../../hooks/useGameManager';
import { useFriends } from '../../hooks/useFriends';
import type { Language } from '../../types/game';
import './NewGameScreen.css';

export function NewGameScreen() {
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();
  const { user } = useAuth();
  const { createGame } = useGameManager(user?.id ?? null);
  const { friends } = useFriends(user?.id ?? null);

  const friend = friends.find((f) => f.userId === friendId);
  const friendName = friend?.username ?? 'Friend';

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

  const handleCreate = async () => {
    if (!friendId) return;
    setCreating(true);
    const result = await createGame([...languages], friendId);
    setCreating(false);
    if (result) navigate('/');
  };

  return (
    <div className="new-game-container">
      <Card padding="lg">
        <BackButton onClick={() => navigate('/')} />
        <h2 className="new-game-title">New Game with {friendName}</h2>
        <p className="new-game-subtitle">Choose which languages are valid</p>

        <div className="new-game-languages">
          {(['en', 'de', 'hu'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => toggleLang(lang)}
              className={`new-game-lang ${languages.has(lang) ? 'new-game-lang--active' : ''}`}
            >
              {{ en: 'English', de: 'German', hu: 'Hungarian' }[lang]}
            </button>
          ))}
        </div>

        <Button className="new-game-start" onClick={handleCreate} disabled={creating}>
          {creating ? <Spinner size="sm" /> : 'Start Game'}
        </Button>
      </Card>
    </div>
  );
}
