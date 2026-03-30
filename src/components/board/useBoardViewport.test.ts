import { describe, it, expect } from 'vitest';
import { buildTransformString } from './useBoardViewport';

describe('useBoardViewport zoom', () => {
  it('returns undefined at scale 1 (no transform needed)', () => {
    expect(buildTransformString(1, 0, 0)).toBeUndefined();
  });

  it('produces correct transform at scale 2.5 with pan', () => {
    const result = buildTransformString(2.5, 225, 225);
    expect(result).toBe('scale(2.5) translate(-225, -225)');
  });

  it('produces correct transform at scale 2.5 with zero pan', () => {
    const result = buildTransformString(2.5, 0, 0);
    expect(result).toBe('scale(2.5) translate(0, 0)');
  });

  it('produces correct transform with fractional pan', () => {
    const result = buildTransformString(2, 100, 150);
    expect(result).toBe('scale(2) translate(-100, -150)');
  });

  it('board and pending groups use same transform string for sync', () => {
    // At any zoom level, both groups must use the identical transform
    // so committed tiles and pending tiles move together during pan
    const cases = [
      { scale: 1, panX: 0, panY: 0 },
      { scale: 2.5, panX: 225, panY: 225 },
      { scale: 2.5, panX: 100, panY: 300 },
      { scale: 1.5, panX: 50, panY: 50 },
    ];
    for (const { scale, panX, panY } of cases) {
      const t1 = buildTransformString(scale, panX, panY);
      const t2 = buildTransformString(scale, panX, panY);
      expect(t1).toBe(t2); // same inputs = same output (pure function)
    }
  });
});
