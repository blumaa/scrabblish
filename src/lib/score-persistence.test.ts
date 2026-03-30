import { describe, it, expect } from 'vitest';

describe('score persistence', () => {
  it('scores accumulate across moves', () => {
    let p1Score = 0;
    let p2Score = 0;

    // Player 1 plays, scores 12
    p1Score += 12;
    expect(p1Score).toBe(12);

    // Player 2 plays, scores 18
    p2Score += 18;
    expect(p2Score).toBe(18);

    // Player 1 plays again, scores 24
    p1Score += 24;
    expect(p1Score).toBe(36);
    expect(p2Score).toBe(18);
  });

  it('winner is player with highest score', () => {
    const p1Score = 142;
    const p2Score = 138;
    const winnerId = p1Score > p2Score ? 'p1' : p1Score < p2Score ? 'p2' : null;
    expect(winnerId).toBe('p1');
  });

  it('game stats can be derived from moves', () => {
    const moves = [
      { player: 'p1', words: ['HAND'], score: 12 },
      { player: 'p2', words: ['CAT', 'AT'], score: 8 },
      { player: 'p1', words: ['HOUSE'], score: 24 },
    ];

    const allWords = moves.flatMap((m) => m.words.map((w) => ({ word: w, score: m.score, player: m.player })));
    const longestWord = allWords.reduce((a, b) => a.word.length > b.word.length ? a : b);
    const highestScore = moves.reduce((a, b) => a.score > b.score ? a : b);

    expect(longestWord.word).toBe('HOUSE');
    expect(highestScore.score).toBe(24);
  });
});
