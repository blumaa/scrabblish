import { describe, it, expect } from 'vitest';
import { calculateWordScore, calculateMoveScore } from './scoring';

import type { PlacedTile, WordFormed } from '../types/game';

function tile(letter: string, points: number, row: number, col: number, isBlank = false): PlacedTile {
  return { id: `${letter}-${row}-${col}`, letter, points, isBlank, row, col };
}

describe('calculateWordScore', () => {
  it('sums tile points for normal squares', () => {
    const tiles = [
      tile('C', 3, 7, 5),
      tile('A', 1, 7, 6),
      tile('T', 1, 7, 8),
    ];
    const newTileIds = new Set(['C-7-5', 'A-7-6', 'T-7-8']);
    expect(calculateWordScore(tiles, newTileIds)).toBe(5);
  });

  it('applies double letter on newly placed tile', () => {
    // Position 0,3 is DL
    const tiles = [tile('H', 4, 0, 3)];
    const newTileIds = new Set(['H-0-3']);
    expect(calculateWordScore(tiles, newTileIds)).toBe(8); // 4 * 2
  });

  it('applies triple letter on newly placed tile', () => {
    // Position 1,5 is TL
    const tiles = [tile('K', 5, 1, 5)];
    const newTileIds = new Set(['K-1-5']);
    expect(calculateWordScore(tiles, newTileIds)).toBe(15); // 5 * 3
  });

  it('applies double word on newly placed tile', () => {
    // Position 1,1 is DW
    const tiles = [
      tile('A', 1, 1, 1),
      tile('T', 1, 1, 2),
    ];
    const newTileIds = new Set(['A-1-1']);
    // (1*2 + 1) * 2 = 6? No: letter premium first, then word premium
    // A on DW: letter score = 1 (no letter premium on DW), word total = 1 + 1 = 2, * 2 = 4
    expect(calculateWordScore(tiles, newTileIds)).toBe(4);
  });

  it('applies triple word on newly placed tile', () => {
    // Position 0,0 is TW
    const tiles = [
      tile('H', 4, 0, 0),
      tile('I', 1, 0, 1),
    ];
    const newTileIds = new Set(['H-0-0']);
    // H=4 + I=1 = 5, * 3 = 15
    expect(calculateWordScore(tiles, newTileIds)).toBe(15);
  });

  it('does not apply premium for already-placed tiles', () => {
    // Position 0,0 is TW — but tile was placed in a previous turn
    const tiles = [
      tile('H', 4, 0, 0),
      tile('I', 1, 0, 1),
    ];
    const newTileIds = new Set(['I-0-1']); // only I is new
    // H=4 (no premium) + I=1 = 5, no word multiplier
    expect(calculateWordScore(tiles, newTileIds)).toBe(5);
  });

  it('stacks multiple word multipliers', () => {
    // Both 0,0 (TW) and 0,7 (TW) are new
    const tiles = [
      tile('A', 1, 0, 0),
      tile('B', 3, 0, 7),
    ];
    const newTileIds = new Set(['A-0-0', 'B-0-7']);
    // A=1 + B=3 = 4, * 3 * 3 = 36
    expect(calculateWordScore(tiles, newTileIds)).toBe(36);
  });

  it('blank tiles contribute 0 points', () => {
    const tiles = [
      tile('A', 0, 7, 7, true), // blank assigned as A
      tile('T', 1, 7, 8),
    ];
    const newTileIds = new Set(['A-7-7', 'T-7-8']);
    // 0 + 1 = 1, star at 7,7 is DW: * 2 = 2
    expect(calculateWordScore(tiles, newTileIds)).toBe(2);
  });
});

describe('calculateMoveScore', () => {
  it('sums scores of all words formed', () => {
    const placedTiles = [tile('A', 1, 7, 7), tile('T', 1, 7, 8)];
    const words: WordFormed[] = [
      { word: 'AT', score: 0, language: null, tiles: placedTiles },
    ];
    const score = calculateMoveScore(words, new Set(placedTiles.map((t) => t.id)));
    // A on star (DW): (1+1) * 2 = 4
    expect(score).toBe(4);
  });

  it('adds 50 point bonus when all 7 tiles are placed', () => {
    const tiles = Array.from({ length: 7 }, (_, i) =>
      tile(String.fromCharCode(65 + i), 1, 7, i + 4)
    );
    const words: WordFormed[] = [
      { word: 'ABCDEFG', score: 0, language: null, tiles },
    ];
    const newIds = new Set(tiles.map((t) => t.id));
    const score = calculateMoveScore(words, newIds);
    // Should include the 50-point bonus
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it('no bonus for fewer than 7 tiles', () => {
    const tiles = [tile('A', 1, 7, 7), tile('T', 1, 7, 8)];
    const words: WordFormed[] = [
      { word: 'AT', score: 0, language: null, tiles },
    ];
    const newIds = new Set(tiles.map((t) => t.id));
    const score = calculateMoveScore(words, newIds);
    expect(score).toBeLessThan(50);
  });
});
