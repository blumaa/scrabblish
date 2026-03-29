import { useRef, type RefObject } from 'react';
import { BOARD_SIZE, CELL_SIZE } from '../../lib/svg-coords';
import { useBoardViewport } from './useBoardViewport';

// Premium square types for visual distinction
type SquareType = 'normal' | 'DL' | 'TL' | 'DW' | 'TW' | 'star';

const SQUARE_COLORS: Record<SquareType, string> = {
  normal: '#dcc8a0',
  DL: '#a8d8ea',
  TL: '#5b9bd5',
  DW: '#f4a6a6',
  TW: '#e74c3c',
  star: '#f4a6a6',
};

// Simplified premium map for the spike (just corners + center)
function getSquareType(row: number, col: number): SquareType {
  if (row === 7 && col === 7) return 'star';
  if ((row === 0 || row === 14) && (col === 0 || col === 14)) return 'TW';
  if ((row === 0 || row === 14) && (col === 3 || col === 11)) return 'DL';
  if ((row === 3 || row === 11) && (col === 0 || col === 14)) return 'DL';
  if (row === col || row + col === 14) {
    if (row >= 1 && row <= 4) return 'DW';
    if (row >= 10 && row <= 13) return 'DW';
  }
  return 'normal';
}

interface BoardProps {
  svgRef: RefObject<SVGSVGElement | null>;
  children?: React.ReactNode | ((viewport: ReturnType<typeof useBoardViewport>) => React.ReactNode);
}

export function Board({ svgRef, children }: BoardProps) {
  const viewport = useBoardViewport();
  const boardRef = useRef<SVGGElement>(null);

  return (
    <div style={{ width: '100%', maxWidth: 600, aspectRatio: '1', margin: '0 auto' }}>
      <svg
        ref={svgRef}
        viewBox={viewport.viewBoxString}
        width="100%"
        height="100%"
        style={{ border: '2px solid #333', borderRadius: 4, touchAction: 'none' }}
        onPointerDown={viewport.handlePointerDown}
        onPointerMove={viewport.handlePointerMove}
        onPointerUp={viewport.handlePointerUp}
      >
        {/* Layer 0: Static board background */}
        <g ref={boardRef} pointerEvents="none">
          {Array.from({ length: BOARD_SIZE }, (_, row) =>
            Array.from({ length: BOARD_SIZE }, (_, col) => {
              const type = getSquareType(row, col);
              return (
                <rect
                  key={`${row}-${col}`}
                  x={col * CELL_SIZE}
                  y={row * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={SQUARE_COLORS[type]}
                  stroke="#b8a07a"
                  strokeWidth={0.5}
                />
              );
            })
          )}
          {/* Center star */}
          <text
            x={7 * CELL_SIZE + CELL_SIZE / 2}
            y={7 * CELL_SIZE + CELL_SIZE / 2 + 6}
            textAnchor="middle"
            fontSize={20}
            fill="#c0392b"
            pointerEvents="none"
          >
            ★
          </text>
        </g>

        {/* Layer 1+: Children (tiles, effects, etc.) */}
        {typeof children === 'function' ? (children as (v: typeof viewport) => React.ReactNode)(viewport) : children}
      </svg>

      {/* Controls (HTML, outside SVG) */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
        <button onClick={() => viewport.dispatch({ type: 'ZOOM_OUT' })}>
          Zoom Out
        </button>
        <span style={{ fontSize: 12, alignSelf: 'center' }}>
          {viewport.isZoomedIn ? 'Zoomed In' : 'Full Board'} |
          Gesture: {viewport.gestureState} |
          Drag Lock: {viewport.dragLocked ? 'ON' : 'off'}
        </span>
      </div>
    </div>
  );
}

export { useBoardViewport };
