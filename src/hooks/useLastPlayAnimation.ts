import { useState, useRef, useEffect, useLayoutEffect, useCallback, type RefObject } from 'react';
import { animateTilesFalling, type AnimTile } from '../lib/tile-animations';
import { getFullWordTiles } from '../lib/word-tiles';
import type { GameState } from '../types/game';

interface UseLastPlayAnimationConfig {
  svgRef: RefObject<SVGSVGElement | null>;
  loading: boolean;
  serverState: GameState | null;
}

/**
 * Hook that manages the "last played word" falling tile animation.
 *
 * Returns `animatingTileKeys` — a Set of "row-col" keys for tiles that
 * should render with visibility="hidden" so GSAP can animate them in.
 */
export function useLastPlayAnimation({ svgRef, loading, serverState }: UseLastPlayAnimationConfig) {
  const [animatingTileKeys, setAnimatingTileKeys] = useState<Set<string> | undefined>(undefined);
  const [initialAnimSet, setInitialAnimSet] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => () => { cleanupRef.current?.(); }, []);

  // Detect transition from loading → loaded and set up hidden tiles
  const [prevLoading, setPrevLoading] = useState(true);
  if (prevLoading && !loading) {
    setPrevLoading(false);

    if (!initialAnimSet && serverState?.lastPlay?.tiles && serverState.lastPlay.tiles.length > 0) {
      const boardEmpty = serverState.board.every((row) => row.every((cell) => cell === null));
      if (!boardEmpty) {
        const fullWordTiles = getFullWordTiles(serverState.board, serverState.lastPlay.tiles);
        const placedSet = new Set(serverState.lastPlay.tiles.map((t) => `${t.row}-${t.col}`));

        const newTileKeys = new Set(fullWordTiles
          .filter((t) => placedSet.has(`${t.row}-${t.col}`))
          .map((t) => `${t.row}-${t.col}`)
        );

        if (newTileKeys.size > 0 || fullWordTiles.length > 0) {
          setInitialAnimSet(true);
          setAnimatingTileKeys(newTileKeys);
        }
      }
    }
  }

  const triggerAnimation = useCallback(() => {
    if (!svgRef.current || !serverState?.lastPlay?.tiles || !serverState.board) return;

    const placedTiles = serverState.lastPlay.tiles;
    const fullWordTiles = getFullWordTiles(serverState.board, placedTiles);
    const placedSet = new Set(placedTiles.map((t) => `${t.row}-${t.col}`));

    // Build ordered list: each tile tagged as new (hidden by React) or overlay (intersection)
    const animTiles: AnimTile[] = fullWordTiles.map((t) => ({
      row: t.row,
      col: t.col,
      isNew: placedSet.has(`${t.row}-${t.col}`),
    }));

    cleanupRef.current?.();
    const { cleanup, done } = animateTilesFalling(svgRef.current, animTiles, serverState.board);
    cleanupRef.current = cleanup;
    done.then(() => setAnimatingTileKeys(undefined));
  }, [svgRef, serverState]);

  // Schedule animation once when initialAnimSet becomes true.
  // Use a ref for the timer so re-renders don't cancel it via effect cleanup.
  const animScheduledRef = useRef(false);
  useLayoutEffect(() => {
    if (animScheduledRef.current) return;
    if (!initialAnimSet) return;

    animScheduledRef.current = true;
    triggerAnimation();
  }, [initialAnimSet, triggerAnimation]);

  return { animatingTileKeys };
}
