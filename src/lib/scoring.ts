import type { PlacedTile, WordFormed } from '../types/game';
import { getSquareType } from '../constants/board';

const BINGO_BONUS = 50;
const BINGO_TILE_COUNT = 7;

/**
 * Calculate the score for a single word, applying premium squares
 * only for newly placed tiles (tiles in newTileIds).
 */
export function calculateWordScore(
  tiles: PlacedTile[],
  newTileIds: Set<string>
): number {
  let wordSum = 0;
  let wordMultiplier = 1;

  for (const t of tiles) {
    let letterScore = t.isBlank ? 0 : t.points;
    const isNew = newTileIds.has(t.id);

    if (isNew) {
      const squareType = getSquareType(t.row, t.col);
      switch (squareType) {
        case 'DL':
          letterScore *= 2;
          break;
        case 'TL':
          letterScore *= 3;
          break;
        case 'DW':
        case 'star':
          wordMultiplier *= 2;
          break;
        case 'TW':
          wordMultiplier *= 3;
          break;
      }
    }

    wordSum += letterScore;
  }

  return wordSum * wordMultiplier;
}

/**
 * Calculate total move score across all words formed,
 * plus the 50-point bingo bonus if all 7 rack tiles were used.
 */
export function calculateMoveScore(
  words: WordFormed[],
  newTileIds: Set<string>
): number {
  let total = 0;

  for (const word of words) {
    total += calculateWordScore(word.tiles, newTileIds);
  }

  if (newTileIds.size >= BINGO_TILE_COUNT) {
    total += BINGO_BONUS;
  }

  return total;
}
