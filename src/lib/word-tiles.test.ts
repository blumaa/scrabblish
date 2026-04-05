import { describe, it, expect } from 'vitest';
import { getFullWordTiles } from './word-tiles';
import type { Board, PlacedTile } from '../types/game';

function emptyBoard(): Board {
  return Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null));
}

function placeTile(board: Board, row: number, col: number, letter: string): Board {
  const tile: PlacedTile = { id: `${letter}-0`, letter, points: 1, isBlank: false, row, col };
  board[row][col] = tile;
  return board;
}

describe('getFullWordTiles', () => {
  it('returns empty array for no placed tiles', () => {
    expect(getFullWordTiles(emptyBoard(), [])).toEqual([]);
  });

  it('returns full horizontal word when new tiles extend an existing tile', () => {
    // Board has C at (7,7). New tiles A,T at (7,8),(7,9) → word is C-A-T
    const board = emptyBoard();
    placeTile(board, 7, 7, 'C');
    placeTile(board, 7, 8, 'A');
    placeTile(board, 7, 9, 'T');

    const placed = [{ row: 7, col: 8 }, { row: 7, col: 9 }];
    const result = getFullWordTiles(board, placed);

    expect(result).toEqual([
      { row: 7, col: 7 },
      { row: 7, col: 8 },
      { row: 7, col: 9 },
    ]);
  });

  it('returns full vertical word', () => {
    const board = emptyBoard();
    placeTile(board, 5, 3, 'C');
    placeTile(board, 6, 3, 'A');
    placeTile(board, 7, 3, 'T');

    // Only A and T are new
    const placed = [{ row: 6, col: 3 }, { row: 7, col: 3 }];
    const result = getFullWordTiles(board, placed);

    expect(result).toEqual([
      { row: 5, col: 3 },
      { row: 6, col: 3 },
      { row: 7, col: 3 },
    ]);
  });

  it('handles single new tile extending in the longer direction', () => {
    // Board has H-E at (7,7),(7,8). New tile L at (7,9). Also D at (6,9).
    // Horizontal word H-E-L is longer than vertical D-L.
    const board = emptyBoard();
    placeTile(board, 7, 7, 'H');
    placeTile(board, 7, 8, 'E');
    placeTile(board, 7, 9, 'L');
    placeTile(board, 6, 9, 'D');

    const placed = [{ row: 7, col: 9 }];
    const result = getFullWordTiles(board, placed);

    expect(result).toEqual([
      { row: 7, col: 7 },
      { row: 7, col: 8 },
      { row: 7, col: 9 },
    ]);
  });

  it('includes tiles before and after placed tiles', () => {
    // Board: B _ _ _ S at (7,3)..(7,7). New tiles E,A,R at (7,4),(7,5),(7,6) → BEARS
    const board = emptyBoard();
    placeTile(board, 7, 3, 'B');
    placeTile(board, 7, 4, 'E');
    placeTile(board, 7, 5, 'A');
    placeTile(board, 7, 6, 'R');
    placeTile(board, 7, 7, 'S');

    const placed = [{ row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }];
    const result = getFullWordTiles(board, placed);

    expect(result).toEqual([
      { row: 7, col: 3 },
      { row: 7, col: 4 },
      { row: 7, col: 5 },
      { row: 7, col: 6 },
      { row: 7, col: 7 },
    ]);
  });

  it('handles word at board edge', () => {
    const board = emptyBoard();
    placeTile(board, 0, 0, 'A');
    placeTile(board, 0, 1, 'T');

    const placed = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    const result = getFullWordTiles(board, placed);

    expect(result).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('standalone word with no intersections returns all placed tiles', () => {
    const board = emptyBoard();
    placeTile(board, 7, 7, 'H');
    placeTile(board, 7, 8, 'I');

    const placed = [{ row: 7, col: 7 }, { row: 7, col: 8 }];
    const result = getFullWordTiles(board, placed);

    expect(result).toEqual([
      { row: 7, col: 7 },
      { row: 7, col: 8 },
    ]);
  });
});
