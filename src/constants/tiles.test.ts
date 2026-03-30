import { describe, it, expect } from 'vitest';
import { TILES_EN } from './tiles-en';
import { TILES_DE } from './tiles-de';
import type { TileDefinition } from '../types/game';

describe('English tile distribution', () => {
  it('has exactly 100 tiles total', () => {
    const total = TILES_EN.reduce((sum, t) => sum + t.count, 0);
    expect(total).toBe(100);
  });

  it('has 2 blank tiles worth 0 points', () => {
    const blank = TILES_EN.find((t) => t.letter === '');
    expect(blank).toBeDefined();
    expect(blank!.count).toBe(2);
    expect(blank!.points).toBe(0);
  });

  it('has 12 E tiles worth 1 point each', () => {
    const e = TILES_EN.find((t) => t.letter === 'E');
    expect(e).toBeDefined();
    expect(e!.count).toBe(12);
    expect(e!.points).toBe(1);
  });

  it('has 1 Z tile worth 10 points', () => {
    const z = TILES_EN.find((t) => t.letter === 'Z');
    expect(z).toBeDefined();
    expect(z!.count).toBe(1);
    expect(z!.points).toBe(10);
  });

  it('has 1 Q tile worth 10 points', () => {
    const q = TILES_EN.find((t) => t.letter === 'Q');
    expect(q).toBeDefined();
    expect(q!.count).toBe(1);
    expect(q!.points).toBe(10);
  });

  it('covers all 26 letters plus blank', () => {
    const letters = TILES_EN.map((t) => t.letter).filter((l) => l !== '');
    expect(letters.length).toBe(26);
    expect(new Set(letters).size).toBe(26);
  });

  it('all points are non-negative integers', () => {
    assertValidTileDefinitions(TILES_EN);
  });
});

describe('German tile distribution', () => {
  it('has exactly 102 tiles total', () => {
    const total = TILES_DE.reduce((sum, t) => sum + t.count, 0);
    expect(total).toBe(102);
  });

  it('has 2 blank tiles worth 0 points', () => {
    const blank = TILES_DE.find((t) => t.letter === '');
    expect(blank).toBeDefined();
    expect(blank!.count).toBe(2);
    expect(blank!.points).toBe(0);
  });

  it('has 15 E tiles worth 1 point each', () => {
    const e = TILES_DE.find((t) => t.letter === 'E');
    expect(e).toBeDefined();
    expect(e!.count).toBe(15);
    expect(e!.points).toBe(1);
  });

  it('has Ä tile', () => {
    const a = TILES_DE.find((t) => t.letter === 'Ä');
    expect(a).toBeDefined();
    expect(a!.count).toBe(1);
  });

  it('has Ö tile', () => {
    const o = TILES_DE.find((t) => t.letter === 'Ö');
    expect(o).toBeDefined();
    expect(o!.count).toBe(1);
  });

  it('has Ü tile', () => {
    const u = TILES_DE.find((t) => t.letter === 'Ü');
    expect(u).toBeDefined();
    expect(u!.count).toBe(1);
  });

  it('has Y tile worth 10 points', () => {
    const y = TILES_DE.find((t) => t.letter === 'Y');
    expect(y).toBeDefined();
    expect(y!.points).toBe(10);
  });

  it('all points are non-negative integers', () => {
    assertValidTileDefinitions(TILES_DE);
  });
});

function assertValidTileDefinitions(tiles: TileDefinition[]) {
  for (const t of tiles) {
    expect(t.points).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(t.points)).toBe(true);
    expect(t.count).toBeGreaterThan(0);
    expect(Number.isInteger(t.count)).toBe(true);
  }
}
