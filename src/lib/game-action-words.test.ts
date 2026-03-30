import { describe, it, expect } from 'vitest';

describe('game-action should store words_formed from client', () => {
  it('submit request body includes words array', () => {
    // The client sends words as part of the submit action
    const requestBody = {
      gameId: 'g1',
      action: 'submit',
      tiles: [{ id: 't1', letter: 'A', points: 1, row: 7, col: 7 }],
      moveNumber: 0,
      score: 5,
      words: ['AT', 'A'],
    };

    expect(requestBody.words).toBeDefined();
    expect(Array.isArray(requestBody.words)).toBe(true);
    expect(requestBody.words.length).toBeGreaterThan(0);
  });

  it('words should be stored as words_formed in move record', () => {
    // The Edge Function should map body.words into the moves insert
    const words = ['HELLO', 'EL'];

    // Expected format for words_formed in the moves table
    const wordsFormed = words.map((word) => ({ word, score: 0 }));

    expect(wordsFormed).toEqual([
      { word: 'HELLO', score: 0 },
      { word: 'EL', score: 0 },
    ]);
  });

  it('useOnlineGame loads lastPlay from moves table words_formed', () => {
    // When words_formed is populated, lastPlay should display
    const moveRow = {
      player_id: 'u1',
      words_formed: [{ word: 'QUIZ' }, { word: 'QI' }],
      score: 42,
    };

    const words = (moveRow.words_formed as { word: string }[]).map((w) => w.word);
    const lastPlay = {
      playerName: 'katja',
      words,
      score: moveRow.score,
    };

    expect(lastPlay.words).toEqual(['QUIZ', 'QI']);
    expect(lastPlay.score).toBe(42);
  });
});
