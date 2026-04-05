import { useState, useMemo, useCallback } from 'react';
import type { Tile } from '../types/game';

interface UseRackConfig {
  tiles: Tile[];
  pendingTileIds: Set<string>;
}

export function useRack({ tiles, pendingTileIds }: UseRackConfig) {
  // rackOrder stores tile IDs in their display order.
  // When empty, we derive order from the tiles array directly.
  const [rackOrder, setRackOrder] = useState<string[]>([]);
  const [swapMode, setSwapMode] = useState(false);
  const [swapSelected, setSwapSelected] = useState<Set<string>>(new Set());

  // Reset rack order when tiles change (new hand from server).
  // Uses the "store previous props in state" pattern from React docs.
  const [prevTileKey, setPrevTileKey] = useState('');
  const currentTileKey = tiles.map((t) => t.id).sort().join(',');
  if (currentTileKey !== prevTileKey) {
    setPrevTileKey(currentTileKey);
    if (prevTileKey && rackOrder.length > 0) {
      setRackOrder([]);
    }
  }

  // The effective order: rackOrder if set, otherwise tile array order
  const effectiveOrder = useMemo(() => {
    if (rackOrder.length > 0) return rackOrder;
    return tiles.map((t) => t.id);
  }, [rackOrder, tiles]);

  const tileMap = useMemo(
    () => new Map(tiles.map((t) => [t.id, t])),
    [tiles]
  );

  const slotContents = useMemo((): (Tile | null)[] => {
    return effectiveOrder.map((id) => {
      if (pendingTileIds.has(id)) return null;
      return tileMap.get(id) ?? null;
    });
  }, [effectiveOrder, pendingTileIds, tileMap]);

  const displayTiles = useMemo(
    () => slotContents.filter((t): t is Tile => t !== null),
    [slotContents]
  );

  const reorderTile = useCallback((tileId: string, toSlotIndex: number) => {
    setRackOrder((prev) => {
      const order = prev.length > 0 ? prev : tiles.map((t) => t.id);
      const fromIndex = order.indexOf(tileId);
      if (fromIndex === -1 || fromIndex === toSlotIndex) return prev.length > 0 ? prev : order;
      const next = [...order];
      next.splice(fromIndex, 1);
      next.splice(toSlotIndex, 0, tileId);
      return next;
    });
  }, [tiles]);

  const shuffle = useCallback(() => {
    setRackOrder(() => {
      const ids = tiles
        .filter((t) => !pendingTileIds.has(t.id))
        .map((t) => t.id);
      // Fisher-Yates shuffle
      const shuffled = [...ids];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, [tiles, pendingTileIds]);

  const snapshotOrder = useCallback(() => {
    if (rackOrder.length === 0) {
      setRackOrder(tiles.map((t) => t.id));
    }
  }, [rackOrder.length, tiles]);

  const getSlotIndex = useCallback((tileId: string): number => {
    return effectiveOrder.indexOf(tileId);
  }, [effectiveOrder]);

  const enterSwapMode = useCallback(() => {
    setSwapMode(true);
    setSwapSelected(new Set());
  }, []);

  const cancelSwapMode = useCallback(() => {
    setSwapMode(false);
    setSwapSelected(new Set());
  }, []);

  const toggleSwapTile = useCallback((tileId: string) => {
    setSwapSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tileId)) next.delete(tileId);
      else next.add(tileId);
      return next;
    });
  }, []);

  const resetSwap = useCallback(() => {
    setSwapMode(false);
    setSwapSelected(new Set());
  }, []);

  return {
    slotContents,
    reorderTile,
    shuffle,
    snapshotOrder,
    getSlotIndex,
    displayTiles,
    swapMode,
    swapSelected,
    enterSwapMode,
    cancelSwapMode,
    toggleSwapTile,
    resetSwap,
  };
}
