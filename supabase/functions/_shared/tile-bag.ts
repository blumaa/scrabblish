// Tile bag logic for Edge Functions
// Tile definitions imported from client source (single source of truth)

import { TILES_EN } from '../../../src/constants/tiles-en.ts';
import { TILES_DE } from '../../../src/constants/tiles-de.ts';
import { TILES_HU } from '../../../src/constants/tiles-hu.ts';

interface Tile {
  id: string;
  letter: string;
  points: number;
  isBlank: boolean;
}

interface TileDefinition {
  letter: string;
  points: number;
  count: number;
}

const TILE_SETS: Record<string, TileDefinition[]> = {
  en: TILES_EN,
  de: TILES_DE,
  hu: TILES_HU,
};

let counter = 0;

function tilesToBag(defs: TileDefinition[]): Tile[] {
  const tiles: Tile[] = [];
  for (const def of defs) {
    for (let i = 0; i < def.count; i++) {
      const uid = counter++;
      tiles.push({
        id: def.letter === '' ? `BLANK-${uid}` : `${def.letter}-${uid}`,
        letter: def.letter,
        points: def.points,
        isBlank: def.letter === '',
      });
    }
  }
  return shuffle(tiles);
}

function shuffle(tiles: Tile[]): Tile[] {
  const arr = [...tiles];
  const rand = new Uint32Array(arr.length);
  crypto.getRandomValues(rand);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand[i] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createMergedBag(languages: string[]): Tile[] {
  if (languages.length === 1) return tilesToBag(TILE_SETS[languages[0]] ?? TILES_EN);

  const merged = new Map<string, { points: number; count: number }>();
  for (const lang of languages) {
    for (const def of (TILE_SETS[lang] ?? [])) {
      const existing = merged.get(def.letter);
      if (existing) {
        existing.count = Math.max(existing.count, def.count);
        existing.points = Math.max(existing.points, def.points);
      } else {
        merged.set(def.letter, { points: def.points, count: def.count });
      }
    }
  }

  const defs: TileDefinition[] = Array.from(merged.entries()).map(
    ([letter, { points, count }]) => ({ letter, points, count })
  );
  return tilesToBag(defs);
}

export function drawTiles(bag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const actual = Math.min(count, bag.length);
  return { drawn: bag.slice(0, actual), remaining: bag.slice(actual) };
}

export type { Tile };
