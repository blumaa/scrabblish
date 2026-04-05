import type { RefObject } from 'react';
import { RackDraggableTile } from './RackDraggableTile';
import { RACK_TILE_SIZE, RACK_GAP, RACK_SLOTS, RACK_TOTAL_W, RACK_OFFSET_X, RACK_Y } from './rack-constants';
import type { Tile } from '../../types/game';
import './Rack.css';

export interface RackProps {
  svgRef: RefObject<SVGSVGElement | null>;
  rackTiles: Tile[];
  rackOrder: string[];
  swapMode: boolean;
  swapSelected: Set<string>;
  onToggleSwapTile: (tileId: string) => void;
  onDropOnBoard: (tileId: string, row: number, col: number) => boolean;
  onReorderTile: (tileId: string, toSlotIndex: number) => void;
  zoomScale: number;
  zoomPanX: number;
  zoomPanY: number;
  onLockViewport: () => void;
  onUnlockViewport: () => void;
}

export function Rack({
  svgRef,
  rackTiles,
  rackOrder,
  swapMode,
  swapSelected,
  onToggleSwapTile,
  onDropOnBoard,
  onReorderTile,
  zoomScale,
  zoomPanX,
  zoomPanY,
  onLockViewport,
  onUnlockViewport,
}: RackProps) {
  return (
    <g id="rack-area">
      {/* Rack background */}
      <g pointerEvents="none">
        <rect
          x={RACK_OFFSET_X - 12}
          y={RACK_Y - 12}
          width={RACK_TOTAL_W + 24}
          height={RACK_TILE_SIZE + 24}
          rx={12}
          fill="var(--bg-rack)"
          stroke="var(--border-default)"
          strokeWidth={1.5}
        />
        {Array.from({ length: RACK_SLOTS }, (_, i) => (
          <rect
            key={`slot-${i}`}
            x={RACK_OFFSET_X + i * (RACK_TILE_SIZE + RACK_GAP) + 3}
            y={RACK_Y + 3}
            width={RACK_TILE_SIZE - 6}
            height={RACK_TILE_SIZE - 6}
            rx={6}
            className="rack-slot"
          />
        ))}
      </g>

      {/* Rack tiles */}
      {rackTiles.map((tile, i) => {
        const slotIndex = rackOrder.length > 0
          ? rackOrder.indexOf(tile.id)
          : i;
        const slot = slotIndex >= 0 ? slotIndex : i;
        const isSwapSelected = swapSelected.has(tile.id);

        if (swapMode) {
          const rx = RACK_OFFSET_X + slot * (RACK_TILE_SIZE + RACK_GAP);
          const liftY = isSwapSelected ? -12 : 0;
          return (
            <g
              key={tile.id}
              data-tile-id={tile.id}
              className={isSwapSelected ? 'tile-swap-selected' : ''}
              transform={`translate(${rx}, ${RACK_Y + liftY})`}
              onClick={() => onToggleSwapTile(tile.id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                width={RACK_TILE_SIZE - 4}
                height={RACK_TILE_SIZE - 4}
                x={2}
                y={2}
                rx={RACK_TILE_SIZE * 0.08}
                className="tile-bg"
              />
              <text
                x={RACK_TILE_SIZE / 2}
                y={RACK_TILE_SIZE / 2 + 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="tile-letter"
                fontSize={RACK_TILE_SIZE * 0.48}
              >
                {tile.letter}
              </text>
              {!tile.isBlank && (
                <text
                  x={RACK_TILE_SIZE - 6}
                  y={RACK_TILE_SIZE - 6}
                  textAnchor="end"
                  className="tile-points"
                  fontSize={RACK_TILE_SIZE * 0.2}
                >
                  {tile.points}
                </text>
              )}
              {isSwapSelected && (
                <text
                  x={RACK_TILE_SIZE - 12}
                  y={18}
                  textAnchor="middle"
                  className="tile-swap-badge"
                >
                  ×
                </text>
              )}
            </g>
          );
        }

        return (
          <RackDraggableTile
            key={tile.id}
            id={tile.id}
            letter={tile.letter}
            points={tile.points}
            isBlank={tile.isBlank}
            slotIndex={slot}
            svgRef={svgRef}
            zoomScale={zoomScale}
            zoomPanX={zoomPanX}
            zoomPanY={zoomPanY}
            onLockViewport={onLockViewport}
            onUnlockViewport={onUnlockViewport}
            onDropOnBoard={(row, col) => onDropOnBoard(tile.id, row, col)}
            onReorderTile={(toSlot) => onReorderTile(tile.id, toSlot)}
          />
        );
      })}
    </g>
  );
}
