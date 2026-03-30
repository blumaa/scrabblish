import { describe, it, expect } from 'vitest';
import { createBag, createMergedBag, drawTiles } from './tile-bag';
import type { Tile } from '../types/game';

describe('createBag', () => {
  it('creates 100 tiles for English', () => {
    const bag = createBag('en');
    expect(bag.length).toBe(100);
  });

  it('creates 102 tiles for German', () => {
    const bag = createBag('de');
    expect(bag.length).toBe(102);
  });

  it('each tile has a unique id', () => {
    const bag = createBag('en');
    const ids = bag.map((t) => t.id);
    expect(new Set(ids).size).toBe(100);
  });

  it('blank tiles have isBlank=true and empty letter', () => {
    const bag = createBag('en');
    const blanks = bag.filter((t) => t.isBlank);
    expect(blanks.length).toBe(2);
    blanks.forEach((b) => {
      expect(b.letter).toBe('');
      expect(b.points).toBe(0);
    });
  });

  it('contains correct number of E tiles for English', () => {
    const bag = createBag('en');
    const eTiles = bag.filter((t) => t.letter === 'E');
    expect(eTiles.length).toBe(12);
  });

  it('German bag contains Ä, Ö, Ü tiles', () => {
    const bag = createBag('de');
    expect(bag.filter((t) => t.letter === 'Ä').length).toBe(1);
    expect(bag.filter((t) => t.letter === 'Ö').length).toBe(1);
    expect(bag.filter((t) => t.letter === 'Ü').length).toBe(1);
  });
});

describe('createMergedBag', () => {
  it('single language returns standard bag', () => {
    const bag = createMergedBag(['en']);
    expect(bag.length).toBe(100);
  });

  it('EN+DE merged bag is larger than either individual bag', () => {
    const merged = createMergedBag(['en', 'de']);
    expect(merged.length).toBeGreaterThan(100);
    expect(merged.length).toBeGreaterThan(102);
  });

  it('merged bag uses MAX count for shared letters', () => {
    const merged = createMergedBag(['en', 'de']);
    // E: max(12 EN, 15 DE) = 15
    const eTiles = merged.filter((t) => t.letter === 'E');
    expect(eTiles.length).toBe(15);
    // N: max(6 EN, 9 DE) = 9
    const nTiles = merged.filter((t) => t.letter === 'N');
    expect(nTiles.length).toBe(9);
    // S: max(4 EN, 7 DE) = 7
    const sTiles = merged.filter((t) => t.letter === 'S');
    expect(sTiles.length).toBe(7);
  });

  it('merged bag includes language-specific tiles (Ä, Ö, Ü)', () => {
    const merged = createMergedBag(['en', 'de']);
    expect(merged.filter((t) => t.letter === 'Ä').length).toBe(1);
    expect(merged.filter((t) => t.letter === 'Ö').length).toBe(1);
    expect(merged.filter((t) => t.letter === 'Ü').length).toBe(1);
  });

  it('merged bag has exactly 2 blanks', () => {
    const merged = createMergedBag(['en', 'de']);
    const blanks = merged.filter((t) => t.isBlank);
    expect(blanks.length).toBe(2);
  });

  it('all tiles have unique ids', () => {
    const merged = createMergedBag(['en', 'de']);
    const ids = merged.map((t) => t.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== merged.length) {
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      throw new Error(`Duplicate IDs found: ${[...new Set(dupes)].join(', ')}`);
    }
    expect(uniqueIds.size).toBe(merged.length);
  });

  it('uses higher point value for shared letters', () => {
    const merged = createMergedBag(['en', 'de']);
    // H: EN=4pts, DE=2pts → higher = 4
    const hTile = merged.find((t) => t.letter === 'H');
    expect(hTile!.points).toBe(4);
    // D: EN=2pts, DE=1pt → higher = 2
    const dTile = merged.find((t) => t.letter === 'D');
    expect(dTile!.points).toBe(2);
  });
});

describe('drawTiles', () => {
  it('draws the requested number of tiles', () => {
    const bag = createBag('en');
    const { drawn, remaining } = drawTiles(bag, 7);
    expect(drawn.length).toBe(7);
    expect(remaining.length).toBe(93);
  });

  it('draws from the front of the bag (already shuffled)', () => {
    const bag: Tile[] = [
      { id: '1', letter: 'A', points: 1, isBlank: false },
      { id: '2', letter: 'B', points: 3, isBlank: false },
      { id: '3', letter: 'C', points: 3, isBlank: false },
    ];
    const { drawn, remaining } = drawTiles(bag, 2);
    expect(drawn.map((t) => t.id)).toEqual(['1', '2']);
    expect(remaining.map((t) => t.id)).toEqual(['3']);
  });

  it('draws all remaining if requested more than available', () => {
    const bag: Tile[] = [
      { id: '1', letter: 'A', points: 1, isBlank: false },
      { id: '2', letter: 'B', points: 3, isBlank: false },
    ];
    const { drawn, remaining } = drawTiles(bag, 5);
    expect(drawn.length).toBe(2);
    expect(remaining.length).toBe(0);
  });

  it('returns empty drawn array from empty bag', () => {
    const { drawn, remaining } = drawTiles([], 7);
    expect(drawn.length).toBe(0);
    expect(remaining.length).toBe(0);
  });
});
