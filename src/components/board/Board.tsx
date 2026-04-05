import { useRef, useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { BOARD_SIZE, CELL_SIZE, BOARD_PX } from '../../lib/svg-coords';
import { calculateWordScore } from '../../lib/scoring';
import { buildTransformString } from './useBoardViewport';
import { Square } from './Square';
import { PlacedTileComponent } from './PlacedTile';
import { useBoardViewport } from './useBoardViewport';
import type { Board as BoardType, PlacedTile, Tile, Language } from '../../types/game';
import type { ValidatedWord } from '../../lib/word-validation';
import { DraggableTile } from './DraggableTile';
import { Rack } from '../rack/Rack';
import { TOTAL_HEIGHT } from '../rack/rack-constants';
import './Board.css';

interface BoardProps {
  svgRef: RefObject<SVGSVGElement | null>;
  pendingShakeRef?: RefObject<SVGGElement | null>;
  board: BoardType;
  pendingTiles: PlacedTile[];
  rackTiles: Tile[];
  onPlaceTile?: (tile: Tile, row: number, col: number) => void;
  onRecallTile?: (tileId: string) => void;
  onMovePendingTile?: (tileId: string, row: number, col: number) => void;
  swapMode?: boolean;
  swapSelected?: Set<string>;
  onToggleSwapTile?: (tileId: string) => void;
  onTilePlaced?: (row: number, col: number) => void;
  validatedWords?: ValidatedWord[];
  committedWords?: { word: string; languages: string[]; tiles: { row: number; col: number }[] }[];
  gameLanguages?: Language[];
  rackOrder?: string[]; // original tile IDs in order, for stable slot positions
  onReorderTile?: (tileId: string, toSlotIndex: number) => void;
  animatingTileKeys?: Set<string>;
}

const SQUARES = Array.from({ length: BOARD_SIZE }, (_, row) =>
  Array.from({ length: BOARD_SIZE }, (_, col) => ({ row, col }))
).flat();

export function Board({
  svgRef,
  pendingShakeRef,
  board,
  pendingTiles,
  rackTiles,
  onPlaceTile,
  onRecallTile,
  onMovePendingTile,
  swapMode = false,
  swapSelected,
  onToggleSwapTile,
  onTilePlaced,
  validatedWords = [],
  committedWords = [],
  gameLanguages = [],
  rackOrder = [],
  onReorderTile,
  animatingTileKeys,
}: BoardProps) {
  const viewport = useBoardViewport();
  const boardGroupRef = useRef<SVGGElement>(null);
  const pendingGroupRef = useRef<SVGGElement>(null);
  const scoreGroupRef = useRef<SVGGElement>(null);
  const mountedRef = useRef(false);
  const prevScaleRef = useRef(1);
  const animRef = useRef({ scale: 1, panX: 0, panY: 0 });
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const applyTransform = () => {
    const t = buildTransformString(animRef.current.scale, animRef.current.panX, animRef.current.panY) ?? '';
    boardGroupRef.current?.setAttribute('transform', t);
    pendingGroupRef.current?.setAttribute('transform', t);
    scoreGroupRef.current?.setAttribute('transform', t);
  };

  useLayoutEffect(() => {
    if (!boardGroupRef.current) return;

    const targetScale = viewport.scale;
    const targetPanX = viewport.panX;
    const targetPanY = viewport.panY;

    // First render — instant
    if (!mountedRef.current) {
      mountedRef.current = true;
      animRef.current = { scale: targetScale, panX: targetPanX, panY: targetPanY };
      applyTransform();
      prevScaleRef.current = targetScale;
      return;
    }

    // Pan gesture — instant (no lag)
    if (viewport.gestureState === 'PANNING') {
      tweenRef.current?.kill();
      tweenRef.current = null;
      animRef.current = { scale: targetScale, panX: targetPanX, panY: targetPanY };
      applyTransform();
      prevScaleRef.current = targetScale;
      return;
    }

    // Zoom changed — animate with GSAP
    if (prevScaleRef.current !== targetScale) {
      prevScaleRef.current = targetScale;
      // Kill any in-flight animation to prevent jumpiness
      tweenRef.current?.kill();
      tweenRef.current = gsap.to(animRef.current, {
        scale: targetScale,
        panX: targetPanX,
        panY: targetPanY,
        duration: 0.3,
        ease: 'power2.out',
        onUpdate: applyTransform,
        onComplete: () => { tweenRef.current = null; },
      });
      return;
    }

    // Programmatic pan (no gesture) — instant
    animRef.current = { scale: targetScale, panX: targetPanX, panY: targetPanY };
    applyTransform();
  }, [viewport.scale, viewport.panX, viewport.panY, viewport.gestureState]);

  const handleDrop = (tileId: string, row: number, col: number): boolean => {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
    if (board[row]?.[col] !== null) return false;
    if (pendingTiles.some((t) => t.row === row && t.col === col)) return false;
    const tile = rackTiles.find((t) => t.id === tileId);
    if (!tile) return false;
    onPlaceTile?.(tile, row, col);
    // Auto-zoom to placement area after drop
    if (!viewport.isZoomedIn) {
      const svgX = col * CELL_SIZE + CELL_SIZE / 2;
      const svgY = row * CELL_SIZE + CELL_SIZE / 2;
      viewport.zoomToPosition(svgX, svgY);
    }
    onTilePlaced?.(row, col);
    return true;
  };

  const handlePendingDrop = (tileId: string, row: number, col: number): boolean => {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
    if (board[row]?.[col] !== null) return false;
    const otherPending = pendingTiles.find((t) => t.id !== tileId && t.row === row && t.col === col);
    if (otherPending) return false;
    onMovePendingTile?.(tileId, row, col);
    return true;
  };

  // Clip the board content so zoomed content doesn't overflow into rack area
  const clipId = 'board-clip';

  return (
    <div className="board-wrapper">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_PX} ${TOTAL_HEIGHT}`}
        className="board-svg"
        onPointerDown={viewport.handlePointerDown}
        onPointerMove={viewport.handlePointerMove}
        onPointerUp={viewport.handlePointerUp}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={BOARD_PX} height={BOARD_PX} />
          </clipPath>
        </defs>

        {/* Board area — clipped and transformed for zoom/pan */}
        <g clipPath={`url(#${clipId})`}>
          <g ref={boardGroupRef}>
            {/* Static board grid */}
            <g id="board-bg" pointerEvents="none">
              {SQUARES.map(({ row, col }) => (
                <Square key={`${row}-${col}`} row={row} col={col} />
              ))}
            </g>

            {/* Committed tiles (static, inside zoom) */}
            <g id="committed-tiles">
              {board.flatMap((row, r) =>
                row.map((tile, c) =>
                  tile ? (
                    <PlacedTileComponent
                      key={`${r}-${c}`}
                      tile={tile}
                      hidden={animatingTileKeys?.has(`${r}-${c}`) ?? false}
                    />
                  ) : null
                )
              )}
            </g>

            {/* Word highlights border only — score badges render outside zoom group */}
            <g id="word-highlights-border" pointerEvents="none">
              {validatedWords.filter((w) => w.valid).map((w) => {
                const tiles = w.tiles;
                if (tiles.length === 0) return null;
                const minCol = Math.min(...tiles.map((t) => t.col));
                const maxCol = Math.max(...tiles.map((t) => t.col));
                const minRow = Math.min(...tiles.map((t) => t.row));
                const maxRow = Math.max(...tiles.map((t) => t.row));
                return (
                  <rect
                    key={`whb-${w.word}-${minRow}-${minCol}`}
                    x={minCol * CELL_SIZE - 1}
                    y={minRow * CELL_SIZE - 1}
                    width={(maxCol - minCol + 1) * CELL_SIZE + 2}
                    height={(maxRow - minRow + 1) * CELL_SIZE + 2}
                    rx={4}
                    fill="none"
                    stroke="var(--color-valid)"
                    strokeWidth={2.5}
                    opacity={0.9}
                  />
                );
              })}
            </g>

          </g>
        </g>

        {/* Rack area — NOT affected by zoom/pan */}
        <Rack
          svgRef={svgRef}
          rackTiles={rackTiles}
          rackOrder={rackOrder}
          swapMode={swapMode}
          swapSelected={swapSelected ?? new Set()}
          onToggleSwapTile={(id) => onToggleSwapTile?.(id)}
          onDropOnBoard={(tileId, row, col) => handleDrop(tileId, row, col)}
          onReorderTile={(tileId, toSlot) => onReorderTile?.(tileId, toSlot)}
          zoomScale={viewport.scale}
          zoomPanX={viewport.panX}
          zoomPanY={viewport.panY}
          onLockViewport={viewport.lockDrag}
          onUnlockViewport={viewport.unlockDrag}
        />

        {/* Pending tiles — rendered AFTER rack so they appear on top when dragged */}
        <g ref={pendingShakeRef}>
          <g ref={pendingGroupRef}>
            {pendingTiles.map((tile) => (
              <DraggableTile
                key={tile.id}
                id={tile.id}
                letter={tile.letter}
                points={tile.points}
                isBlank={tile.isBlank}
                isPending
                initialX={tile.col * CELL_SIZE + CELL_SIZE / 2}
                initialY={tile.row * CELL_SIZE + CELL_SIZE / 2}
                tileSize={CELL_SIZE}
                svgRef={svgRef}
                zoomScale={viewport.scale}
                zoomPanX={viewport.panX}
                zoomPanY={viewport.panY}
                onLockViewport={viewport.lockDrag}
                onUnlockViewport={viewport.unlockDrag}
                onDrop={(row, col) => handlePendingDrop(tile.id, row, col)}
                onRecall={() => onRecallTile?.(tile.id)}
              />
            ))}
          </g>
        </g>

        {/* Word score badges — ABOVE pending tiles so they're visible */}
        <g id="word-highlights" pointerEvents="none" ref={scoreGroupRef}>
          {validatedWords.filter((w) => w.valid).map((w) => {
            const tiles = w.tiles;
            if (tiles.length === 0) return null;
            const minCol = Math.min(...tiles.map((t) => t.col));
            const minRow = Math.min(...tiles.map((t) => t.row));
            const maxRow = Math.max(...tiles.map((t) => t.row));
            const newTileIds = new Set(pendingTiles.map((t) => t.id));
            const wordScore = calculateWordScore(tiles, newTileIds);
            const rectX = minCol * CELL_SIZE + 2;
            const rectY = (maxRow + 1) * CELL_SIZE - 18;
            const maxCol = Math.max(...tiles.map((t) => t.col));
            const langLabel = w.languages.map((l) => l.toUpperCase()).join('/');
            const langW = langLabel.length * 5 + 6;
            const langX = (maxCol + 1) * CELL_SIZE - langW - 2;
            const langY = minRow * CELL_SIZE + 2;
            return (
              <g key={`whs-${w.word}-${minRow}-${minCol}`}>
                <g transform={`translate(${rectX}, ${rectY})`}>
                  <rect width={26} height={16} rx={3} fill="var(--color-valid)" />
                  <text x={13} y={12} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--moon)">
                    {wordScore}
                  </text>
                </g>
                {langLabel && gameLanguages.length > 1 && (
                  <g transform={`translate(${langX}, ${langY})`}>
                    <rect width={langW} height={10} rx={2} fill="var(--color-primary)" opacity={0.75} />
                    <text x={langW / 2} y={7.5} textAnchor="middle" fontSize={6} fontWeight={600} fill="var(--moon)">
                      {langLabel}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Committed word language badges */}
          {gameLanguages.length > 1 && committedWords.map((cw, i) => {
            if (cw.languages.length === 0 || cw.tiles.length === 0) return null;
            const minRow = Math.min(...cw.tiles.map((t) => t.row));
            const maxCol = Math.max(...cw.tiles.map((t) => t.col));
            const langLabel = cw.languages.map((l) => l.toUpperCase()).join('/');
            const langW = langLabel.length * 5 + 6;
            const langX = (maxCol + 1) * CELL_SIZE - langW - 2;
            const langY = minRow * CELL_SIZE + 2;
            return (
              <g key={`cwl-${cw.word}-${i}`} transform={`translate(${langX}, ${langY})`}>
                <rect width={langW} height={10} rx={2} fill="var(--color-primary)" opacity={0.6} />
                <text x={langW / 2} y={7.5} textAnchor="middle" fontSize={6} fontWeight={600} fill="var(--moon)">
                  {langLabel}
                </text>
              </g>
            );
          })}
        </g>

        {/* Effects layer (above everything) */}
        <g id="effects" style={{ willChange: 'transform' }} />
      </svg>
    </div>
  );
}

