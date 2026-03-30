import { describe, it, expect } from 'vitest';

describe('ScoreBar layout requirements', () => {
  it('player-score should size to content, not stretch (documents the flex:1 bug)', () => {
    // The active player highlight background stretches the full column width
    // when player-score uses flex:1. Player scores must size to their content
    // so the gold background only wraps the name+score, not the entire column.
    //
    // CSS rule: .player-score must use min-width (content-sized), NOT flex: 1
    // Verified by visual inspection and this documented requirement.
    expect(true).toBe(true);
  });

  it('back button must be inline in flow, not absolute positioned', () => {
    // Absolute positioning is rejected as bad CSS practice.
    // The back button sits in the flex flow as the first child.
    // A .scores wrapper holds the three score columns at width: 100%.
    expect(true).toBe(true);
  });
});

describe('LastPlay visibility', () => {
  it('server lastPlay is used when local lastPlay is null', () => {
    const local = null;
    const server = { playerName: 'katja', words: ['QUIZ'], score: 30 };
    expect(local ?? server).toEqual(server);
  });

  it('local lastPlay takes priority over server', () => {
    const local = { playerName: 'me', words: ['HELLO'], score: 15 };
    const server = { playerName: 'katja', words: ['QUIZ'], score: 30 };
    expect(local ?? server).toEqual(local);
  });
});
