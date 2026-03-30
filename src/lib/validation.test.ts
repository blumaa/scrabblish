import { describe, it, expect } from 'vitest';
import { validatePlacement } from './validation';
import { createEmptyBoard } from './board-utils';
import type { PlacedTile } from '../types/game';

function tile(letter: string, row: number, col: number): PlacedTile {
  return { id: `${letter}-${row}-${col}`, letter, points: 1, isBlank: false, row, col };
}

describe('validatePlacement', () => {
  it('rejects empty placement', () => {
    const board = createEmptyBoard();
    const result = validatePlacement(board, [], true);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/no tiles/i);
  });

  it('accepts valid first move on center', () => {
    const board = createEmptyBoard();
    const tiles = [tile('H', 7, 7), tile('I', 7, 8)];
    const result = validatePlacement(board, tiles, true);
    expect(result.valid).toBe(true);
  });

  it('rejects first move not on center', () => {
    const board = createEmptyBoard();
    const tiles = [tile('H', 0, 0), tile('I', 0, 1)];
    const result = validatePlacement(board, tiles, true);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/center/i);
  });

  it('rejects tiles not in a line', () => {
    const board = createEmptyBoard();
    const tiles = [tile('H', 7, 7), tile('I', 8, 8)];
    const result = validatePlacement(board, tiles, true);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/line/i);
  });

  it('rejects placement on occupied square', () => {
    const board = createEmptyBoard();
    board[7][7] = tile('A', 7, 7);
    const tiles = [tile('B', 7, 7)];
    const result = validatePlacement(board, tiles, false);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/occupied/i);
  });

  it('rejects isolated tiles on subsequent move', () => {
    const board = createEmptyBoard();
    board[7][7] = tile('A', 7, 7);
    const tiles = [tile('B', 0, 0)];
    const result = validatePlacement(board, tiles, false);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/connect/i);
  });

  it('accepts valid subsequent move adjacent to existing', () => {
    const board = createEmptyBoard();
    board[7][7] = tile('A', 7, 7);
    const tiles = [tile('T', 7, 8)];
    const result = validatePlacement(board, tiles, false);
    expect(result.valid).toBe(true);
  });

  it('rejects tiles with gaps not filled by board', () => {
    const board = createEmptyBoard();
    // H at 7,5 and D at 7,8 with nothing between
    const tiles = [tile('H', 7, 7), tile('D', 7, 9)];
    const result = validatePlacement(board, tiles, true);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/gap/i);
  });

  it('accepts tiles with gaps filled by existing board tiles', () => {
    const board = createEmptyBoard();
    board[7][7] = tile('A', 7, 7);
    // Place tiles at 7,6 and 7,8 — gap at 7,7 filled by board
    const tiles = [tile('C', 7, 6), tile('T', 7, 8)];
    const result = validatePlacement(board, tiles, false);
    expect(result.valid).toBe(true);
  });

  it('rejects first move with single tile (must form a word)', () => {
    const board = createEmptyBoard();
    const tiles = [tile('A', 7, 7)];
    const result = validatePlacement(board, tiles, true);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 2/i);
  });
});
