import { useRef, useEffect, useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { screenToSvgCoords, svgCoordsToBoard, snapToGrid, CELL_SIZE, BOARD_PX } from '../../lib/svg-coords';

gsap.registerPlugin(Draggable);

interface DraggableTileProps {
  id: string;
  letter: string;
  points: number;
  isBlank?: boolean;
  isPending?: boolean;
  initialX: number;
  initialY: number;
  tileSize?: number;
  svgRef: RefObject<SVGSVGElement | null>;
  zoomScale?: number;
  zoomPanX?: number;
  zoomPanY?: number;
  onLockViewport?: () => void;
  onUnlockViewport?: () => void;
  onDrop?: (row: number, col: number) => boolean;
  onRecall?: () => void;
}

export function DraggableTile({
  id,
  letter,
  points,
  isBlank = false,
  isPending = false,
  initialX,
  initialY,
  tileSize = CELL_SIZE,
  svgRef,
  zoomScale = 1,
  zoomPanX = 0,
  zoomPanY = 0,
  onLockViewport,
  onUnlockViewport,
  onDrop,
  onRecall,
}: DraggableTileProps) {
  const groupRef = useRef<SVGGElement>(null);
  const draggableRef = useRef<Draggable | null>(null);

  const onLockRef = useRef(onLockViewport);
  const onUnlockRef = useRef(onUnlockViewport);
  const onDropRef = useRef(onDrop);
  const onRecallRef = useRef(onRecall);
  const svgRefRef = useRef(svgRef);
  const zoomRef = useRef({ scale: zoomScale, panX: zoomPanX, panY: zoomPanY });

  useEffect(() => {
    onLockRef.current = onLockViewport;
    onUnlockRef.current = onUnlockViewport;
    onDropRef.current = onDrop;
    onRecallRef.current = onRecall;
    svgRefRef.current = svgRef;
    zoomRef.current = { scale: zoomScale, panX: zoomPanX, panY: zoomPanY };
  });

  const initPos = useRef({ x: initialX - tileSize / 2, y: initialY - tileSize / 2 });

  // Update GSAP position when props change (e.g., MOVE_PENDING_TILE)
  useLayoutEffect(() => {
    const el = groupRef.current;
    if (!el) return;
    const newX = initialX - tileSize / 2;
    const newY = initialY - tileSize / 2;
    if (newX !== initPos.current.x || newY !== initPos.current.y) {
      initPos.current = { x: newX, y: newY };
      gsap.set(el, { x: newX, y: newY });
    }
  }, [initialX, initialY, tileSize]);

  useLayoutEffect(() => {
    const el = groupRef.current;
    if (!el) return;

    gsap.set(el, { x: initPos.current.x, y: initPos.current.y });

    const [instance] = Draggable.create(el, {
      type: 'x,y',
      zIndexBoost: true,
      minimumMovement: 0,
      onDragStart() {
        onLockRef.current?.();
      },
      onDragEnd() {
        const svg = svgRefRef.current.current;
        if (!svg) return;

        const rect = el.getBoundingClientRect();
        const centerScreenX = rect.left + rect.width / 2;
        const centerScreenY = rect.top + rect.height / 2;
        const svgCoords = screenToSvgCoords(svg, centerScreenX, centerScreenY);

        // Check if tile is in the board area (SVG space)
        // svgCoords are in root SVG space. BOARD_PX is the board boundary.
        const inBoardSvgArea = svgCoords.y < BOARD_PX && svgCoords.y >= 0 &&
                               svgCoords.x >= 0 && svgCoords.x < BOARD_PX;

        let handled = false;

        if (inBoardSvgArea) {
          // Convert to board coords for grid snapping
          const { scale, panX, panY } = zoomRef.current;
          const boardCoords = svgCoordsToBoard(svgCoords.x, svgCoords.y, scale, panX, panY);
          const snapped = snapToGrid(boardCoords.x, boardCoords.y, CELL_SIZE);
          const col = Math.floor(snapped.x / CELL_SIZE);
          const row = Math.floor(snapped.y / CELL_SIZE);
          handled = onDropRef.current?.(row, col) ?? false;
        }

        if (!handled) {
          // Not placed on a valid board cell — recall to rack or snap back
          if (onRecallRef.current) {
            onRecallRef.current();
          } else {
            // Rack tile: snap back to original position
            gsap.to(el, {
              x: initPos.current.x,
              y: initPos.current.y,
              duration: 0.2,
              ease: 'power2.out',
            });
          }
        }

        onUnlockRef.current?.();
      },
    });

    draggableRef.current = instance;

    return () => {
      instance.kill();
      draggableRef.current = null;
      gsap.set(el, { clearProps: 'all' });
    };
  }, []);

  const half = tileSize / 2;
  const fontSize = tileSize * 0.48;
  const ptsFontSize = tileSize * 0.2;

  return (
    <g
      ref={groupRef}
      data-tile-id={id}
      className={[isBlank && 'tile-blank', isPending && 'tile-pending'].filter(Boolean).join(' ') || undefined}
      style={{ cursor: 'grab' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <rect
        width={tileSize - 4}
        height={tileSize - 4}
        x={2}
        y={2}
        rx={tileSize * 0.08}
        className="tile-bg"
      />
      <text
        x={half}
        y={half + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="tile-letter"
        fontSize={fontSize}
      >
        {letter || (isBlank ? '' : '')}
      </text>
      {!isBlank && points > 0 && (
        <text
          x={tileSize - 6}
          y={tileSize - 6}
          textAnchor="end"
          className="tile-points"
          fontSize={ptsFontSize}
        >
          {points}
        </text>
      )}
    </g>
  );
}
