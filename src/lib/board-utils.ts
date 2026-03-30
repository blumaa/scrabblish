import type { Board, PlacedTile, WordFormed } from '../types/game';
import { BOARD_SIZE } from '../types/game';

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function placeTileOnBoard(board: Board, tile: PlacedTile): Board {
  const newBoard = board.map((row) => [...row]);
  newBoard[tile.row][tile.col] = tile;
  return newBoard;
}

/**
 * Check if all placed tiles are in a single row or column.
 */
export function areTilesInLine(tiles: PlacedTile[]): boolean {
  if (tiles.length <= 1) return true;
  const sameRow = tiles.every((t) => t.row === tiles[0].row);
  const sameCol = tiles.every((t) => t.col === tiles[0].col);
  return sameRow || sameCol;
}

/**
 * Check if placed tiles connect to existing tiles on the board.
 * First move must cover the center square (7,7).
 */
export function areTilesConnected(
  board: Board,
  placedTiles: PlacedTile[],
  isFirstMove: boolean
): boolean {
  if (isFirstMove) {
    return placedTiles.some((t) => t.row === 7 && t.col === 7);
  }

  // Build a set of all pending tile positions for fast lookup
  const pendingSet = new Set(placedTiles.map((t) => `${t.row},${t.col}`));

  // At least one pending tile must be adjacent to an existing board tile
  for (const t of placedTiles) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = t.row + dr;
      const nc = t.col + dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
      // Adjacent to an existing committed tile (not another pending tile)
      if (board[nr][nc] !== null && !pendingSet.has(`${nr},${nc}`)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find all words formed by placing tiles on the board.
 * Returns words of length >= 2 only.
 *
 * Algorithm:
 * 1. Build a virtual board (existing + newly placed tiles)
 * 2. For each placed tile, scan horizontally and vertically to find full words
 * 3. Deduplicate by word position
 */
export function getWordsFormedByMove(
  board: Board,
  placedTiles: PlacedTile[]
): WordFormed[] {
  // Build virtual board with pending tiles
  const virtual = board.map((row) => [...row]);
  for (const t of placedTiles) {
    virtual[t.row][t.col] = t;
  }

  const found = new Map<string, WordFormed>(); // key: "startRow,startCol,direction"

  for (const t of placedTiles) {
    // Check horizontal word through this tile
    const hWord = extractWord(virtual, t.row, t.col, 'horizontal');
    if (hWord && hWord.tiles.length >= 2) {
      const key = `${hWord.tiles[0].row},${hWord.tiles[0].col},h`;
      if (!found.has(key)) {
        found.set(key, hWord);
      }
    }

    // Check vertical word through this tile
    const vWord = extractWord(virtual, t.row, t.col, 'vertical');
    if (vWord && vWord.tiles.length >= 2) {
      const key = `${vWord.tiles[0].row},${vWord.tiles[0].col},v`;
      if (!found.has(key)) {
        found.set(key, vWord);
      }
    }
  }

  return Array.from(found.values());
}

function extractWord(
  board: Board,
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical'
): WordFormed | null {
  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;

  // Walk backwards to find the start of the word
  let startRow = row;
  let startCol = col;
  while (
    startRow - dr >= 0 &&
    startCol - dc >= 0 &&
    board[startRow - dr][startCol - dc] !== null
  ) {
    startRow -= dr;
    startCol -= dc;
  }

  // Walk forward to collect all tiles
  const tiles: PlacedTile[] = [];
  let r = startRow;
  let c = startCol;
  while (
    r >= 0 && r < BOARD_SIZE &&
    c >= 0 && c < BOARD_SIZE &&
    board[r][c] !== null
  ) {
    tiles.push(board[r][c]!);
    r += dr;
    c += dc;
  }

  if (tiles.length < 2) return null;

  const word = tiles.map((t) => t.letter).join('');
  return { word, score: 0, language: null, tiles };
}
