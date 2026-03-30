import type { Board, PlacedTile } from '../types/game';
import { BOARD_SIZE } from '../types/game';
import { areTilesInLine, areTilesConnected } from './board-utils';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate structural placement rules (not dictionary validation).
 */
export function validatePlacement(
  board: Board,
  placedTiles: PlacedTile[],
  isFirstMove: boolean
): ValidationResult {
  if (placedTiles.length === 0) {
    return { valid: false, error: 'No tiles placed' };
  }

  // First move must have at least 2 tiles
  if (isFirstMove && placedTiles.length < 2) {
    return { valid: false, error: 'First move must have at least 2 tiles' };
  }

  // Check for occupied squares
  for (const t of placedTiles) {
    if (t.row < 0 || t.row >= BOARD_SIZE || t.col < 0 || t.col >= BOARD_SIZE) {
      return { valid: false, error: 'Tile placed out of bounds' };
    }
    if (board[t.row][t.col] !== null) {
      return { valid: false, error: 'Square is already occupied' };
    }
  }

  // Tiles must be in a single row or column
  if (!areTilesInLine(placedTiles)) {
    return { valid: false, error: 'Tiles must be in a straight line' };
  }

  // Check for gaps
  if (placedTiles.length > 1) {
    const gapResult = checkForGaps(board, placedTiles);
    if (!gapResult.valid) return gapResult;
  }

  // Connectivity
  if (!areTilesConnected(board, placedTiles, isFirstMove)) {
    if (isFirstMove) {
      return { valid: false, error: 'First word must cover the center square' };
    }
    return { valid: false, error: 'Tiles must connect to existing words' };
  }

  return { valid: true };
}

function checkForGaps(board: Board, tiles: PlacedTile[]): ValidationResult {
  const sameRow = tiles.every((t) => t.row === tiles[0].row);

  if (sameRow) {
    const row = tiles[0].row;
    const cols = tiles.map((t) => t.col).sort((a, b) => a - b);
    const placedCols = new Set(cols);
    for (let c = cols[0]; c <= cols[cols.length - 1]; c++) {
      if (!placedCols.has(c) && board[row][c] === null) {
        return { valid: false, error: 'Gap in tile placement' };
      }
    }
  } else {
    const col = tiles[0].col;
    const rows = tiles.map((t) => t.row).sort((a, b) => a - b);
    const placedRows = new Set(rows);
    for (let r = rows[0]; r <= rows[rows.length - 1]; r++) {
      if (!placedRows.has(r) && board[r][col] === null) {
        return { valid: false, error: 'Gap in tile placement' };
      }
    }
  }

  return { valid: true };
}
