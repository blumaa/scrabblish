import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  getWordsFormedByMove,
  areTilesInLine,
  areTilesConnected,
} from './board-utils';
import type { PlacedTile } from '../types/game';

function tile(letter: string, row: number, col: number): PlacedTile {
  return { id: `${letter}-${row}-${col}`, letter, points: 1, isBlank: false, row, col };
}

describe('createEmptyBoard', () => {
  it('creates a 15x15 board of nulls', () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(15);
    expect(board[0].length).toBe(15);
    expect(board[7][7]).toBeNull();
  });
});

describe('areTilesInLine', () => {
  it('returns true for a single tile', () => {
    expect(areTilesInLine([tile('A', 7, 7)])).toBe(true);
  });

  it('returns true for tiles in same row', () => {
    const tiles = [tile('H', 7, 5), tile('I', 7, 6)];
    expect(areTilesInLine(tiles)).toBe(true);
  });

  it('returns true for tiles in same column', () => {
    const tiles = [tile('H', 5, 7), tile('I', 6, 7)];
    expect(areTilesInLine(tiles)).toBe(true);
  });

  it('returns false for tiles not in a line', () => {
    const tiles = [tile('H', 5, 5), tile('I', 6, 7)];
    expect(areTilesInLine(tiles)).toBe(false);
  });

  it('returns true for tiles in same row with gaps (gaps filled by board)', () => {
    const tiles = [tile('H', 7, 5), tile('D', 7, 8)];
    expect(areTilesInLine(tiles)).toBe(true);
  });
});

describe('areTilesConnected', () => {
  it('first move: connected if any tile covers center (7,7)', () => {
    const board = createEmptyBoard();
    const tiles = [tile('H', 7, 7)];
    expect(areTilesConnected(board, tiles, true)).toBe(true);
  });

  it('first move: not connected if no tile covers center', () => {
    const board = createEmptyBoard();
    const tiles = [tile('H', 0, 0)];
    expect(areTilesConnected(board, tiles, true)).toBe(false);
  });

  it('subsequent move: connected if adjacent to existing tile', () => {
    const board = createEmptyBoard();
    board[7][7] = tile('A', 7, 7);
    const newTiles = [tile('B', 7, 8)];
    expect(areTilesConnected(board, newTiles, false)).toBe(true);
  });

  it('subsequent move: not connected if isolated', () => {
    const board = createEmptyBoard();
    board[7][7] = tile('A', 7, 7);
    const newTiles = [tile('B', 0, 0)];
    expect(areTilesConnected(board, newTiles, false)).toBe(false);
  });

  it('subsequent move: connected through chain of pending tiles', () => {
    const board = createEmptyBoard();
    board[7][7] = tile('A', 7, 7);
    // B at 7,8 and C at 7,9 — B touches A, C touches B
    const newTiles = [tile('B', 7, 8), tile('C', 7, 9)];
    expect(areTilesConnected(board, newTiles, false)).toBe(true);
  });
});

describe('getWordsFormedByMove', () => {
  it('single tile forming a horizontal word with existing tiles', () => {
    const board = createEmptyBoard();
    board[7][6] = tile('C', 7, 6);
    board[7][7] = tile('A', 7, 7);
    const placed = [tile('T', 7, 8)];
    const words = getWordsFormedByMove(board, placed);
    expect(words.length).toBe(1);
    expect(words[0].word).toBe('CAT');
  });

  it('single tile forming both horizontal and vertical words', () => {
    const board = createEmptyBoard();
    board[7][6] = tile('C', 7, 6);
    board[7][7] = tile('A', 7, 7);
    board[6][8] = tile('O', 6, 8);
    board[8][8] = tile('P', 8, 8);
    // Place T at 7,8 — forms "CAT" horizontally and "OTP" vertically
    const placed = [tile('T', 7, 8)];
    const words = getWordsFormedByMove(board, placed);
    expect(words.length).toBe(2);
    const wordStrings = words.map((w) => w.word).sort();
    expect(wordStrings).toEqual(['CAT', 'OTP']);
  });

  it('multiple tiles forming one word', () => {
    const board = createEmptyBoard();
    const placed = [tile('H', 7, 5), tile('I', 7, 6)];
    const words = getWordsFormedByMove(board, placed);
    expect(words.length).toBe(1);
    expect(words[0].word).toBe('HI');
  });

  it('does not return single-letter words', () => {
    const board = createEmptyBoard();
    const placed = [tile('A', 7, 7)];
    const words = getWordsFormedByMove(board, placed);
    expect(words.length).toBe(0);
  });

  it('multiple tiles forming main word plus cross words', () => {
    const board = createEmptyBoard();
    board[6][7] = tile('B', 6, 7);
    board[6][8] = tile('E', 6, 8);
    // Place A at 7,7 and T at 7,8 — forms "AT" horizontally,
    // "BA" vertically at col 7, "ET" vertically at col 8
    const placed = [tile('A', 7, 7), tile('T', 7, 8)];
    const words = getWordsFormedByMove(board, placed);
    const wordStrings = words.map((w) => w.word).sort();
    expect(wordStrings).toEqual(['AT', 'BA', 'ET']);
  });

  it('extends existing word', () => {
    const board = createEmptyBoard();
    board[7][7] = tile('A', 7, 7);
    board[7][8] = tile('T', 7, 8);
    // Place C before A — "CAT"
    const placed = [tile('C', 7, 6)];
    const words = getWordsFormedByMove(board, placed);
    expect(words.length).toBe(1);
    expect(words[0].word).toBe('CAT');
  });
});
