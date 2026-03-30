import { describe, it, expect } from 'vitest';
import { extractPlayerGameStats, extractBestWord, extractLongestWord, countWordsPerLanguage } from './stats';
import type { Language } from '../types/game';

interface MoveRecord {
  playerId: string;
  moveType: 'place' | 'exchange' | 'pass';
  score: number;
  wordsFormed: { word: string; score: number }[] | null;
}

const makeMoves = (...moves: MoveRecord[]): MoveRecord[] => moves;

describe('extractBestWord', () => {
  it('returns null for empty moves', () => {
    expect(extractBestWord([], 'p1')).toBeNull();
  });

  it('returns null when player has no place moves', () => {
    const moves = makeMoves(
      { playerId: 'p2', moveType: 'place', score: 20, wordsFormed: [{ word: 'HELLO', score: 20 }] },
    );
    expect(extractBestWord(moves, 'p1')).toBeNull();
  });

  it('finds the highest scoring word for a player', () => {
    const moves = makeMoves(
      { playerId: 'p1', moveType: 'place', score: 12, wordsFormed: [{ word: 'CAT', score: 5 }, { word: 'AT', score: 7 }] },
      { playerId: 'p1', moveType: 'place', score: 30, wordsFormed: [{ word: 'QUIZ', score: 30 }] },
    );
    expect(extractBestWord(moves, 'p1')).toEqual({ word: 'QUIZ', score: 30 });
  });

  it('ignores exchange moves', () => {
    const moves = makeMoves(
      { playerId: 'p1', moveType: 'exchange', score: 0, wordsFormed: null },
      { playerId: 'p1', moveType: 'place', score: 8, wordsFormed: [{ word: 'DOG', score: 8 }] },
    );
    expect(extractBestWord(moves, 'p1')).toEqual({ word: 'DOG', score: 8 });
  });

  it('handles moves with null wordsFormed', () => {
    const moves = makeMoves(
      { playerId: 'p1', moveType: 'place', score: 5, wordsFormed: null },
    );
    expect(extractBestWord(moves, 'p1')).toBeNull();
  });
});

describe('extractLongestWord', () => {
  it('returns null for empty moves', () => {
    expect(extractLongestWord([], 'p1')).toBeNull();
  });

  it('finds the longest word played by a player', () => {
    const moves = makeMoves(
      { playerId: 'p1', moveType: 'place', score: 10, wordsFormed: [{ word: 'CAT', score: 5 }, { word: 'CATASTROPHE', score: 25 }] },
      { playerId: 'p1', moveType: 'place', score: 8, wordsFormed: [{ word: 'HI', score: 8 }] },
    );
    expect(extractLongestWord(moves, 'p1')).toBe('CATASTROPHE');
  });

  it('picks alphabetically first on tie', () => {
    const moves = makeMoves(
      { playerId: 'p1', moveType: 'place', score: 10, wordsFormed: [{ word: 'BAT', score: 5 }] },
      { playerId: 'p1', moveType: 'place', score: 10, wordsFormed: [{ word: 'CAT', score: 5 }] },
    );
    expect(extractLongestWord(moves, 'p1')).toBe('BAT');
  });
});

describe('countWordsPerLanguage', () => {
  it('returns empty map for no moves', () => {
    const result = countWordsPerLanguage([], 'p1', ['en', 'de']);
    expect(result).toEqual(new Map());
  });

  it('counts total words played and attributes to all game languages', () => {
    const moves = makeMoves(
      { playerId: 'p1', moveType: 'place', score: 10, wordsFormed: [{ word: 'CAT', score: 5 }, { word: 'AT', score: 3 }] },
      { playerId: 'p1', moveType: 'place', score: 8, wordsFormed: [{ word: 'DOG', score: 8 }] },
    );
    const result = countWordsPerLanguage(moves, 'p1', ['en', 'de']);
    expect(result.get('en')).toBe(3);
    expect(result.get('de')).toBe(3);
  });

  it('only counts the given player', () => {
    const moves = makeMoves(
      { playerId: 'p1', moveType: 'place', score: 10, wordsFormed: [{ word: 'CAT', score: 5 }] },
      { playerId: 'p2', moveType: 'place', score: 8, wordsFormed: [{ word: 'DOG', score: 8 }] },
    );
    const result = countWordsPerLanguage(moves, 'p1', ['en']);
    expect(result.get('en')).toBe(1);
  });
});

describe('extractPlayerGameStats', () => {
  it('returns complete stats for a player', () => {
    const moves = makeMoves(
      { playerId: 'p1', moveType: 'place', score: 15, wordsFormed: [{ word: 'HELLO', score: 10 }, { word: 'EL', score: 5 }] },
      { playerId: 'p2', moveType: 'place', score: 20, wordsFormed: [{ word: 'WORLD', score: 20 }] },
      { playerId: 'p1', moveType: 'place', score: 30, wordsFormed: [{ word: 'QUIZ', score: 30 }] },
      { playerId: 'p2', moveType: 'exchange', score: 0, wordsFormed: null },
      { playerId: 'p1', moveType: 'place', score: 8, wordsFormed: [{ word: 'AT', score: 8 }] },
    );

    const stats = extractPlayerGameStats(moves, 'p1', 53, ['en'] as Language[]);

    expect(stats.totalScore).toBe(53);
    expect(stats.bestWord).toBe('QUIZ');
    expect(stats.bestWordScore).toBe(30);
    expect(stats.longestWord).toBe('HELLO');
    expect(stats.wordsPerLanguage.get('en')).toBe(4); // HELLO, EL, QUIZ, AT
  });

  it('handles player with no place moves', () => {
    const moves = makeMoves(
      { playerId: 'p1', moveType: 'exchange', score: 0, wordsFormed: null },
    );

    const stats = extractPlayerGameStats(moves, 'p1', 0, ['en'] as Language[]);

    expect(stats.totalScore).toBe(0);
    expect(stats.bestWord).toBeNull();
    expect(stats.bestWordScore).toBe(0);
    expect(stats.longestWord).toBeNull();
    expect(stats.wordsPerLanguage.get('en')).toBeUndefined();
  });
});
