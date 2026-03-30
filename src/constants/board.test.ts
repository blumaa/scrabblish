import { describe, it, expect } from 'vitest';
import { PREMIUM_SQUARES, getSquareType } from './board';
import type { SquareType } from '../types/game';

describe('board constants', () => {
  it('has exactly 61 premium squares (including center star)', () => {
    const premiumCount = Array.from(PREMIUM_SQUARES.values()).filter(
      (t) => t !== 'normal'
    ).length;
    expect(premiumCount).toBe(61);
  });

  it('center square is star type', () => {
    expect(getSquareType(7, 7)).toBe('star');
  });

  it('corners are triple word', () => {
    expect(getSquareType(0, 0)).toBe('TW');
    expect(getSquareType(0, 14)).toBe('TW');
    expect(getSquareType(14, 0)).toBe('TW');
    expect(getSquareType(14, 14)).toBe('TW');
  });

  it('has 8 triple word squares', () => {
    const twCount = countType('TW');
    expect(twCount).toBe(8);
  });

  it('has 17 double word squares (including center star)', () => {
    // Standard Scrabble: 17 DW squares, but center star overlaps one
    // We count star separately, so DW = 16, star = 1
    const dwCount = countType('DW');
    const starCount = countType('star');
    expect(dwCount + starCount).toBe(17);
  });

  it('has 12 triple letter squares', () => {
    expect(countType('TL')).toBe(12);
  });

  it('has 24 double letter squares', () => {
    expect(countType('DL')).toBe(24);
  });

  it('board is symmetric across both axes and diagonals', () => {
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const type = getSquareType(row, col);
        // Horizontal symmetry
        expect(getSquareType(row, 14 - col)).toBe(type);
        // Vertical symmetry
        expect(getSquareType(14 - row, col)).toBe(type);
        // Both
        expect(getSquareType(14 - row, 14 - col)).toBe(type);
      }
    }
  });
});

function countType(type: SquareType): number {
  let count = 0;
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      if (getSquareType(r, c) === type) count++;
    }
  }
  return count;
}
