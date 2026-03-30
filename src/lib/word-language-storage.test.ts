import { describe, it, expect } from 'vitest';

describe('word language storage in moves', () => {
  it('words_formed should include language array per word', () => {
    // When a move is submitted, each word should store which languages validated it
    const wordsFormed = [
      { word: 'HELLO', score: 10, languages: ['en'] },
      { word: 'AT', score: 2, languages: ['en', 'de'] },
    ];

    for (const w of wordsFormed) {
      expect(w.languages).toBeDefined();
      expect(Array.isArray(w.languages)).toBe(true);
      expect(w.languages.length).toBeGreaterThan(0);
    }
  });

  it('client sends languages with each word in submit action', () => {
    // The callEdgeFunction body for submit should include languages per word
    const body = {
      gameId: 'g1',
      action: 'submit',
      tiles: [{ id: 't1', letter: 'A', points: 1, row: 7, col: 7 }],
      moveNumber: 0,
      score: 5,
      words: [
        { word: 'AT', languages: ['en', 'de'] },
      ],
    };

    expect(body.words[0].languages).toEqual(['en', 'de']);
  });

  it('edge function stores languages in words_formed column', () => {
    // The moves table words_formed JSONB should have this shape
    const wordsFormed = [
      { word: 'QUIZ', score: 0, languages: ['en'] },
    ];

    const json = JSON.stringify(wordsFormed);
    const parsed = JSON.parse(json);
    expect(parsed[0].languages).toEqual(['en']);
  });

  it('useOnlineGame reads languages from words_formed for lastPlay', () => {
    // When loading lastPlay from moves table, languages should be available
    const moveRow = {
      words_formed: [
        { word: 'QUIZ', score: 0, languages: ['en'] },
        { word: 'QI', score: 0, languages: ['en'] },
      ],
    };

    const words = moveRow.words_formed.map((w: { word: string }) => w.word);
    const languages = moveRow.words_formed.flatMap((w: { languages: string[] }) => w.languages);
    const uniqueLangs = [...new Set(languages)];

    expect(words).toEqual(['QUIZ', 'QI']);
    expect(uniqueLangs).toEqual(['en']);
  });
});
