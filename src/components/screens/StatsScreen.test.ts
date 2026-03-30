import { describe, it, expect } from 'vitest';
import type { PlayerStats, GameHistoryItem } from '../../types/stats';

describe('stats display logic', () => {
  it('calculates win rate percentage', () => {
    const stats: PlayerStats = {
      userId: 'u1',
      gamesPlayed: 10,
      wins: 7,
      totalScore: 1200,
      bestWordScore: 45,
      bestWord: 'QUIZ',
      longestWord: 'CATASTROPHE',
      currentWinStreak: 3,
      bestWinStreak: 5,
    };
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    expect(winRate).toBe(70);
  });

  it('returns 0% win rate when no games played', () => {
    const stats: PlayerStats = {
      userId: 'u1',
      gamesPlayed: 0,
      wins: 0,
      totalScore: 0,
      bestWordScore: 0,
      bestWord: null,
      longestWord: null,
      currentWinStreak: 0,
      bestWinStreak: 0,
    };
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    expect(winRate).toBe(0);
  });

  it('average score per game calculation', () => {
    const stats: PlayerStats = {
      userId: 'u1',
      gamesPlayed: 4,
      wins: 2,
      totalScore: 600,
      bestWordScore: 50,
      bestWord: 'QUARTZ',
      longestWord: 'QUARTZ',
      currentWinStreak: 1,
      bestWinStreak: 2,
    };
    const avgScore = stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;
    expect(avgScore).toBe(150);
  });

  it('determines game result from winnerId', () => {
    const myId = 'u1';
    const game: GameHistoryItem = {
      id: 'g1',
      languages: ['en', 'de'],
      myScore: 150,
      opponentScore: 120,
      opponentName: 'katja',
      winnerId: 'u1',
      finishedAt: '2026-03-25T10:00:00Z',
    };

    const result = game.winnerId === myId ? 'W' : game.winnerId === null ? 'T' : 'L';
    expect(result).toBe('W');
  });

  it('determines loss result', () => {
    const myId = 'u1';
    const game: GameHistoryItem = {
      id: 'g2',
      languages: ['en'],
      myScore: 90,
      opponentScore: 130,
      opponentName: 'katja',
      winnerId: 'u2',
      finishedAt: '2026-03-24T10:00:00Z',
    };

    const result = game.winnerId === myId ? 'W' : game.winnerId === null ? 'T' : 'L';
    expect(result).toBe('L');
  });

  it('determines tie result', () => {
    const myId = 'u1';
    const game: GameHistoryItem = {
      id: 'g3',
      languages: ['en', 'de'],
      myScore: 100,
      opponentScore: 100,
      opponentName: 'katja',
      winnerId: null,
      finishedAt: '2026-03-23T10:00:00Z',
    };

    const result = game.winnerId === myId ? 'W' : game.winnerId === null ? 'T' : 'L';
    expect(result).toBe('T');
  });

  it('sorts game history by date descending', () => {
    const games: GameHistoryItem[] = [
      { id: 'g1', languages: ['en'], myScore: 100, opponentScore: 90, opponentName: 'a', winnerId: 'u1', finishedAt: '2026-03-20T10:00:00Z' },
      { id: 'g3', languages: ['en'], myScore: 80, opponentScore: 120, opponentName: 'c', winnerId: 'u2', finishedAt: '2026-03-25T10:00:00Z' },
      { id: 'g2', languages: ['en'], myScore: 110, opponentScore: 90, opponentName: 'b', winnerId: 'u1', finishedAt: '2026-03-22T10:00:00Z' },
    ];

    const sorted = [...games].sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime());
    expect(sorted[0].id).toBe('g3');
    expect(sorted[1].id).toBe('g2');
    expect(sorted[2].id).toBe('g1');
  });
});
