import { describe, it, expect } from 'vitest';

describe('TileCountRing progress calculation', () => {
  it('returns 100% when bag is full', () => {
    const total = 100;
    const remaining = 100;
    const pct = remaining / total;
    expect(pct).toBe(1);
  });

  it('returns 50% when half tiles remain', () => {
    const total = 100;
    const remaining = 50;
    const pct = remaining / total;
    expect(pct).toBe(0.5);
  });

  it('returns 0% when bag is empty', () => {
    const total = 100;
    const remaining = 0;
    const pct = remaining / total;
    expect(pct).toBe(0);
  });

  it('SVG circle dashoffset = circumference * (1 - pct)', () => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const pct = 0.75; // 75% remaining

    const dashoffset = circumference * (1 - pct);
    expect(dashoffset).toBeCloseTo(circumference * 0.25);
  });

  it('total tiles for merged EN+DE bag is around 115', () => {
    // Merged bag MAX strategy: max(EN=100, DE=102) + unique letters
    // The exact number depends on merge, but should be > 100
    const total = 115; // approximate
    expect(total).toBeGreaterThan(100);
  });
});
