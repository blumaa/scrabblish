// Tile bag logic for Edge Functions (Deno-compatible, no React imports)

interface TileDefinition {
  letter: string;
  points: number;
  count: number;
}

interface Tile {
  id: string;
  letter: string;
  points: number;
  isBlank: boolean;
}

const TILES_EN: TileDefinition[] = [
  { letter: '', points: 0, count: 2 },
  { letter: 'A', points: 1, count: 9 }, { letter: 'B', points: 3, count: 2 },
  { letter: 'C', points: 3, count: 2 }, { letter: 'D', points: 2, count: 4 },
  { letter: 'E', points: 1, count: 12 }, { letter: 'F', points: 4, count: 2 },
  { letter: 'G', points: 2, count: 3 }, { letter: 'H', points: 4, count: 2 },
  { letter: 'I', points: 1, count: 9 }, { letter: 'J', points: 8, count: 1 },
  { letter: 'K', points: 5, count: 1 }, { letter: 'L', points: 1, count: 4 },
  { letter: 'M', points: 3, count: 2 }, { letter: 'N', points: 1, count: 6 },
  { letter: 'O', points: 1, count: 8 }, { letter: 'P', points: 3, count: 2 },
  { letter: 'Q', points: 10, count: 1 }, { letter: 'R', points: 1, count: 6 },
  { letter: 'S', points: 1, count: 4 }, { letter: 'T', points: 1, count: 6 },
  { letter: 'U', points: 1, count: 4 }, { letter: 'V', points: 4, count: 2 },
  { letter: 'W', points: 4, count: 2 }, { letter: 'X', points: 8, count: 1 },
  { letter: 'Y', points: 4, count: 2 }, { letter: 'Z', points: 10, count: 1 },
];

const TILES_DE: TileDefinition[] = [
  { letter: '', points: 0, count: 2 },
  { letter: 'A', points: 1, count: 5 }, { letter: 'Ä', points: 6, count: 1 },
  { letter: 'B', points: 3, count: 2 }, { letter: 'C', points: 4, count: 2 },
  { letter: 'D', points: 1, count: 4 }, { letter: 'E', points: 1, count: 15 },
  { letter: 'F', points: 4, count: 2 }, { letter: 'G', points: 2, count: 3 },
  { letter: 'H', points: 2, count: 4 }, { letter: 'I', points: 1, count: 6 },
  { letter: 'J', points: 6, count: 1 }, { letter: 'K', points: 4, count: 2 },
  { letter: 'L', points: 2, count: 3 }, { letter: 'M', points: 3, count: 4 },
  { letter: 'N', points: 1, count: 9 }, { letter: 'O', points: 2, count: 3 },
  { letter: 'Ö', points: 8, count: 1 }, { letter: 'P', points: 4, count: 1 },
  { letter: 'Q', points: 10, count: 1 }, { letter: 'R', points: 1, count: 6 },
  { letter: 'S', points: 1, count: 7 }, { letter: 'T', points: 1, count: 6 },
  { letter: 'U', points: 1, count: 6 }, { letter: 'Ü', points: 6, count: 1 },
  { letter: 'V', points: 6, count: 1 }, { letter: 'W', points: 3, count: 1 },
  { letter: 'X', points: 8, count: 1 }, { letter: 'Y', points: 10, count: 1 },
  { letter: 'Z', points: 3, count: 1 },
];

const TILE_SETS: Record<string, TileDefinition[]> = { en: TILES_EN, de: TILES_DE };

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
