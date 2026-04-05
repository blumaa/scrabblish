import type { Board } from '../types/game';
import { BOARD_SIZE } from '../types/game';

interface Position {
  row: number;
  col: number;
}

/**
 * Given the board and the newly placed tile positions from a move,
 * returns all tile positions that form the primary word (including
 * pre-existing tiles that the new tiles extend).
 *
 * Determines the word direction from the placed tiles, then walks
 * the board in both directions to find the full extent of the word.
 */
export function getFullWordTiles(board: Board, placedTiles: Position[]): Position[] {
  if (placedTiles.length === 0) return [];
  if (placedTiles.length === 1) {
    // Single tile — check both directions, pick the longer word
    const horiz = extendWord(board, placedTiles[0], 'horizontal');
    const vert = extendWord(board, placedTiles[0], 'vertical');
    return horiz.length >= vert.length ? horiz : vert;
  }

  // Determine direction from placed tiles
  const sameRow = placedTiles.every((t) => t.row === placedTiles[0].row);
  const direction = sameRow ? 'horizontal' : 'vertical';

  return extendWord(board, placedTiles[0], direction);
}

function extendWord(board: Board, start: Position, direction: 'horizontal' | 'vertical'): Position[] {
  const tiles: Position[] = [];
  const dr = direction === 'vertical' ? -1 : 0;
  const dc = direction === 'horizontal' ? -1 : 0;

  // Walk backward to find the start of the word
  let r = start.row + dr;
  let c = start.col + dc;
  while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE && board[r][c] !== null) {
    tiles.unshift({ row: r, col: c });
    r += dr;
    c += dc;
  }

  // Add tiles forward from start position
  const fr = direction === 'vertical' ? 1 : 0;
  const fc = direction === 'horizontal' ? 1 : 0;
  r = start.row;
  c = start.col;
  while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE && board[r][c] !== null) {
    tiles.push({ row: r, col: c });
    r += fr;
    c += fc;
  }

  return tiles;
}
