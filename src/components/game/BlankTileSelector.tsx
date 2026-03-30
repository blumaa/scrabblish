import { getAvailableLetters } from '../../lib/blank-letters';
import type { Language } from '../../types/game';
import './BlankTileSelector.css';

interface BlankTileSelectorProps {
  languages: Language[];
  onSelect: (letter: string) => void;
  onCancel: () => void;
}

export function BlankTileSelector({ languages, onSelect, onCancel }: BlankTileSelectorProps) {
  const letters = getAvailableLetters(languages);

  return (
    <div className="blank-selector-overlay" onClick={onCancel}>
      <div className="blank-selector-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="blank-selector-title">Choose a letter</h3>
        <div className="blank-selector-grid">
          {letters.map((letter) => (
            <button
              key={letter}
              className="blank-selector-letter"
              onClick={() => onSelect(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
        <button className="blank-selector-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
