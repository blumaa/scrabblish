import { describe, it, expect } from 'vitest';
import { generateJoinCode, isValidJoinCode } from './game-action';
import { createMergedBag, drawTiles } from './tile-bag';
import { validatePlacement } from './validation';
import { getWordsFormedByMove, createEmptyBoard } from './board-utils';
import { calculateMoveScore } from './scoring';
import type { PlacedTile } from '../types/game';

function tile(letter: string, points: number, row: number, col: number): PlacedTile {
  return { id: `${letter}-${row}-${col}`, letter, points, isBlank: false, row, col };
}

describe('Edge Function logic (shared with server)', () => {
  describe('create-game flow', () => {
    it('creates bag, deals 7 tiles, leaves correct remaining', () => {
      const bag = createMergedBag(['en', 'de']);
      const totalTiles = bag.length;
      const { drawn: hand1, remaining: after1 } = drawTiles(bag, 7);
      expect(hand1.length).toBe(7);
      expect(after1.length).toBe(totalTiles - 7);

      const { drawn: hand2, remaining: after2 } = drawTiles(after1, 7);
      expect(hand2.length).toBe(7);
      expect(after2.length).toBe(totalTiles - 14);
    });

    it('generates valid join codes', () => {
      const code = generateJoinCode();
      expect(isValidJoinCode(code)).toBe(true);
      expect(code.length).toBe(8);
    });
  });

  describe('submit-move flow', () => {
    it('validates placement, finds words, calculates score', () => {
      const board = createEmptyBoard();
      const placed: PlacedTile[] = [
        tile('C', 3, 7, 6),
        tile('A', 1, 7, 7),
        tile('T', 1, 7, 8),
      ];

      // Validate placement
      const validation = validatePlacement(board, placed, true);
      expect(validation.valid).toBe(true);

      // Find words
      const words = getWordsFormedByMove(board, placed);
      expect(words.length).toBe(1);
      expect(words[0].word).toBe('CAT');

      // Calculate score
      const newTileIds = new Set(placed.map((t) => t.id));
      const score = calculateMoveScore(words, newTileIds);
      // C(3) + A(1) on star(DW) + T(1) = 5 * 2 = 10
      expect(score).toBe(10);
    });

    it('rejects placement on occupied square', () => {
      const board = createEmptyBoard();
      board[7][7] = tile('A', 1, 7, 7);
      const placed = [tile('B', 3, 7, 7)];
      const validation = validatePlacement(board, placed, false);
      expect(validation.valid).toBe(false);
    });
  });
});
