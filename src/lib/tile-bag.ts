import type { Language, Tile, TileDefinition } from '../types/game';
import { TILES_EN } from '../constants/tiles-en';
import { TILES_DE } from '../constants/tiles-de';

const TILE_SETS: Record<Language, TileDefinition[]> = {
  en: TILES_EN,
  de: TILES_DE,
};

/**
 * Create a tile bag for a single language using the standard distribution.
 */
export function createBag(language: Language): Tile[] {
  return tilesToBag(TILE_SETS[language]);
}

/**
 * Create a merged tile bag for multi-language games.
 * For each shared letter, uses the MAX count from any language.
 * Point values use the higher value (rewards cross-language play).
 * Language-specific tiles (Ä, Ö, Ü) are included when that language is selected.
 */
export function createMergedBag(languages: Language[]): Tile[] {
  if (languages.length === 1) {
    return createBag(languages[0]);
  }

  // Merge: for each letter, take max count and max points
  const merged = new Map<string, { points: number; count: number }>();

  for (const lang of languages) {
    for (const def of TILE_SETS[lang]) {
      const existing = merged.get(def.letter);
      if (existing) {
        existing.count = Math.max(existing.count, def.count);
        existing.points = Math.max(existing.points, def.points);
      } else {
        merged.set(def.letter, { points: def.points, count: def.count });
      }
    }
  }

  const definitions: TileDefinition[] = Array.from(merged.entries()).map(
    ([letter, { points, count }]) => ({ letter, points, count })
  );

  return tilesToBag(definitions);
}

/**
 * Draw tiles from the front of the bag.
 * Bag should already be shuffled.
 */
export function drawTiles(
  bag: Tile[],
  count: number
): { drawn: Tile[]; remaining: Tile[] } {
  const actual = Math.min(count, bag.length);
  return {
    drawn: bag.slice(0, actual),
    remaining: bag.slice(actual),
  };
}

/**
 * Shuffle an array in place using crypto-secure randomness.
 * Fisher-Yates shuffle with crypto.getRandomValues.
 */
export function shuffleBag(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  const randomValues = new Uint32Array(shuffled.length);
  crypto.getRandomValues(randomValues);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

let tileCounter = 0;

function tilesToBag(definitions: TileDefinition[]): Tile[] {
  const tiles: Tile[] = [];
  for (const def of definitions) {
    for (let i = 0; i < def.count; i++) {
      const uid = tileCounter++;
      tiles.push({
        id: def.letter === '' ? `BLANK-${uid}` : `${def.letter}-${uid}`,
        letter: def.letter,
        points: def.points,
        isBlank: def.letter === '',
      });
    }
  }
  return shuffleBag(tiles);
}
