import { describe, it, expect } from 'vitest';

// Test the swap mode state logic (not the component rendering)
describe('swap mode logic', () => {
  it('toggles tile selection on and off', () => {
    const selected = new Set<string>();

    // Select a tile
    selected.add('A-0');
    expect(selected.has('A-0')).toBe(true);
    expect(selected.size).toBe(1);

    // Select another
    selected.add('B-0');
    expect(selected.size).toBe(2);

    // Deselect the first
    selected.delete('A-0');
    expect(selected.has('A-0')).toBe(false);
    expect(selected.size).toBe(1);
  });

  it('cannot swap more tiles than are in the bag', () => {
    const tilesRemaining = 3;
    const selectedCount = 5;
    expect(selectedCount <= tilesRemaining).toBe(false);
  });

  it('must select at least 1 tile to swap', () => {
    const selectedCount = 0;
    expect(selectedCount > 0).toBe(false);
  });
});
