import { describe, it, expect } from 'vitest';

describe('game over logic', () => {
  it('determines winner as player with highest score', () => {
    const p1Score = 142;
    const p2Score = 138;
    const winnerId = p1Score > p2Score ? 'p1' : p1Score < p2Score ? 'p2' : null;
    expect(winnerId).toBe('p1');
  });

  it('returns null for tie', () => {
    const p1Score = 100;
    const p2Score = 100;
    const winnerId = p1Score > p2Score ? 'p1' : p1Score < p2Score ? 'p2' : null;
    expect(winnerId).toBeNull();
  });
});
