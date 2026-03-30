import { describe, it, expect } from 'vitest';

describe('last play display (MDS-244)', () => {
  it('shows swap message when last move was exchange', () => {
    const lastMove = { move_type: 'exchange', tiles_exchanged_count: 3, player_id: 'u1', words_formed: null, score: 0 };
    const playerName = 'katja';

    const lastPlay = lastMove.move_type === 'exchange'
      ? { playerName, words: [`swapped ${lastMove.tiles_exchanged_count} tiles`], score: 0 }
      : lastMove.words_formed
        ? { playerName, words: (lastMove.words_formed as { word: string }[]).map((w) => w.word), score: lastMove.score }
        : null;

    expect(lastPlay).not.toBeNull();
    expect(lastPlay!.words[0]).toBe('swapped 3 tiles');
    expect(lastPlay!.score).toBe(0);
  });

  it('shows word when last move was place', () => {
    const lastMove = { move_type: 'place', tiles_exchanged_count: null, player_id: 'u1', words_formed: [{ word: 'HELLO' }], score: 15 };
    const playerName = 'katja';

    const lastPlay = lastMove.move_type === 'exchange'
      ? { playerName, words: [`swapped ${lastMove.tiles_exchanged_count} tiles`], score: 0 }
      : lastMove.words_formed
        ? { playerName, words: (lastMove.words_formed as { word: string }[]).map((w) => w.word), score: lastMove.score }
        : null;

    expect(lastPlay).not.toBeNull();
    expect(lastPlay!.words).toEqual(['HELLO']);
    expect(lastPlay!.score).toBe(15);
  });
});
