import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRack } from './useRack';
import type { Tile } from '../types/game';

function makeTile(letter: string, index = 0): Tile {
  return { id: `${letter}-${index}`, letter, points: 1, isBlank: false };
}

function makeTiles(letters: string): Tile[] {
  return letters.split('').map((l, i) => makeTile(l, i));
}

describe('useRack', () => {
  const tiles7 = makeTiles('ABCDEFG');

  describe('slotContents', () => {
    it('returns all tiles in order when none are pending', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      expect(result.current.slotContents).toEqual(tiles7);
    });

    it('returns null for pending tile slots', () => {
      const pending = new Set([tiles7[2].id]); // C is pending
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: pending })
      );
      const contents = result.current.slotContents;
      expect(contents[0]).toEqual(tiles7[0]); // A
      expect(contents[1]).toEqual(tiles7[1]); // B
      expect(contents[2]).toBeNull();          // C is on board
      expect(contents[3]).toEqual(tiles7[3]); // D
      expect(contents.filter(Boolean)).toHaveLength(6);
    });

    it('handles fewer than 7 tiles', () => {
      const tiles3 = makeTiles('ABC');
      const { result } = renderHook(() =>
        useRack({ tiles: tiles3, pendingTileIds: new Set() })
      );
      expect(result.current.slotContents).toEqual(tiles3);
    });
  });

  describe('displayTiles', () => {
    it('returns only non-null tiles in slot order', () => {
      const pending = new Set([tiles7[1].id, tiles7[4].id]);
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: pending })
      );
      expect(result.current.displayTiles.map((t) => t.letter)).toEqual([
        'A', 'C', 'D', 'F', 'G',
      ]);
    });
  });

  describe('reorderTile', () => {
    it('moves a tile to a different slot', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      act(() => result.current.reorderTile(tiles7[0].id, 3));
      const letters = result.current.slotContents.map((t) => t?.letter);
      // A moves from 0 to 3: B C D A E F G
      expect(letters).toEqual(['B', 'C', 'D', 'A', 'E', 'F', 'G']);
    });

    it('moves a tile backward', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      act(() => result.current.reorderTile(tiles7[5].id, 1));
      const letters = result.current.slotContents.map((t) => t?.letter);
      // F moves from 5 to 1: A F B C D E G
      expect(letters).toEqual(['A', 'F', 'B', 'C', 'D', 'E', 'G']);
    });

    it('does nothing for same slot', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      act(() => result.current.reorderTile(tiles7[2].id, 2));
      const letters = result.current.slotContents.map((t) => t?.letter);
      expect(letters).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    });
  });

  describe('shuffle', () => {
    it('preserves all tile IDs', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      const originalIds = result.current.slotContents.map((t) => t?.id).sort();
      act(() => result.current.shuffle());
      const shuffledIds = result.current.slotContents.map((t) => t?.id).sort();
      expect(shuffledIds).toEqual(originalIds);
    });
  });

  describe('snapshotOrder + recall', () => {
    it('preserves slot position after tile removed and re-added', () => {
      let pendingIds = new Set<string>();
      const { result, rerender } = renderHook(
        ({ pending }) => useRack({ tiles: tiles7, pendingTileIds: pending }),
        { initialProps: { pending: pendingIds } }
      );

      // Snapshot the order
      act(() => result.current.snapshotOrder());

      // Simulate placing tile C on the board
      pendingIds = new Set([tiles7[2].id]);
      rerender({ pending: pendingIds });
      expect(result.current.slotContents[2]).toBeNull();

      // Simulate recalling tile C
      pendingIds = new Set<string>();
      rerender({ pending: pendingIds });
      expect(result.current.slotContents[2]?.letter).toBe('C');
    });
  });

  describe('getSlotIndex', () => {
    it('returns correct index for each tile', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      expect(result.current.getSlotIndex(tiles7[0].id)).toBe(0);
      expect(result.current.getSlotIndex(tiles7[6].id)).toBe(6);
    });

    it('returns -1 for unknown tile', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      expect(result.current.getSlotIndex('unknown')).toBe(-1);
    });
  });

  describe('swap mode', () => {
    it('starts not in swap mode', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      expect(result.current.swapMode).toBe(false);
      expect(result.current.swapSelected.size).toBe(0);
    });

    it('enters swap mode', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      act(() => result.current.enterSwapMode());
      expect(result.current.swapMode).toBe(true);
    });

    it('toggles tile selection', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      act(() => result.current.enterSwapMode());
      act(() => result.current.toggleSwapTile(tiles7[0].id));
      expect(result.current.swapSelected.has(tiles7[0].id)).toBe(true);
      act(() => result.current.toggleSwapTile(tiles7[0].id));
      expect(result.current.swapSelected.has(tiles7[0].id)).toBe(false);
    });

    it('cancel clears selection and exits swap mode', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      act(() => result.current.enterSwapMode());
      act(() => result.current.toggleSwapTile(tiles7[0].id));
      act(() => result.current.cancelSwapMode());
      expect(result.current.swapMode).toBe(false);
      expect(result.current.swapSelected.size).toBe(0);
    });

    it('resetSwap clears selection and exits swap mode', () => {
      const { result } = renderHook(() =>
        useRack({ tiles: tiles7, pendingTileIds: new Set() })
      );
      act(() => result.current.enterSwapMode());
      act(() => result.current.toggleSwapTile(tiles7[1].id));
      act(() => result.current.resetSwap());
      expect(result.current.swapMode).toBe(false);
      expect(result.current.swapSelected.size).toBe(0);
    });
  });

  describe('new tiles from server', () => {
    it('updates when tiles change (e.g., after move submission)', () => {
      const newTiles = makeTiles('HIJKLMN');
      const { result, rerender } = renderHook(
        ({ t }) => useRack({ tiles: t, pendingTileIds: new Set() }),
        { initialProps: { t: tiles7 } }
      );
      expect(result.current.slotContents[0]?.letter).toBe('A');
      rerender({ t: newTiles });
      expect(result.current.slotContents[0]?.letter).toBe('H');
    });
  });
});
