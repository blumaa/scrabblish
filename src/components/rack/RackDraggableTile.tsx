import { useRef, useEffect, useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { screenToSvgCoords } from '../../lib/svg-coords';
import { classifyDrop } from './classify-drop';
import { RACK_TILE_SIZE, RACK_GAP, RACK_OFFSET_X, RACK_Y } from './rack-constants';

gsap.registerPlugin(Draggable);

interface RackDraggableTileProps {
  id: string;
  letter: string;
  points: number;
  isBlank?: boolean;
  slotIndex: number;
  svgRef: RefObject<SVGSVGElement | null>;
  zoomScale?: number;
  zoomPanX?: number;
  zoomPanY?: number;
  onLockViewport?: () => void;
  onUnlockViewport?: () => void;
  onDropOnBoard?: (row: number, col: number) => boolean;
  onReorderTile?: (toSlotIndex: number) => void;
}

function slotX(slotIndex: number): number {
  return RACK_OFFSET_X + slotIndex * (RACK_TILE_SIZE + RACK_GAP);
}

export function RackDraggableTile({
  id,
  letter,
  points,
  isBlank = false,
  slotIndex,
  svgRef,
  zoomScale = 1,
  zoomPanX = 0,
  zoomPanY = 0,
  onLockViewport,
  onUnlockViewport,
  onDropOnBoard,
  onReorderTile,
}: RackDraggableTileProps) {
  const groupRef = useRef<SVGGElement>(null);
  const draggableRef = useRef<Draggable | null>(null);

  const onLockRef = useRef(onLockViewport);
  const onUnlockRef = useRef(onUnlockViewport);
  const onDropOnBoardRef = useRef(onDropOnBoard);
  const onReorderRef = useRef(onReorderTile);
  const svgRefRef = useRef(svgRef);
  const zoomRef = useRef({ scale: zoomScale, panX: zoomPanX, panY: zoomPanY });
  const slotIndexRef = useRef(slotIndex);

  useEffect(() => {
    onLockRef.current = onLockViewport;
    onUnlockRef.current = onUnlockViewport;
    onDropOnBoardRef.current = onDropOnBoard;
    onReorderRef.current = onReorderTile;
    svgRefRef.current = svgRef;
    zoomRef.current = { scale: zoomScale, panX: zoomPanX, panY: zoomPanY };
    slotIndexRef.current = slotIndex;
  });

  const initPos = useRef({ x: slotX(slotIndex), y: RACK_Y });

  // Animate to new slot when slotIndex changes (from reorder)
  useLayoutEffect(() => {
    const el = groupRef.current;
    if (!el) return;
    const newX = slotX(slotIndex);
    const newY = RACK_Y;
    if (newX !== initPos.current.x || newY !== initPos.current.y) {
      initPos.current = { x: newX, y: newY };
      gsap.to(el, {
        x: newX,
        y: newY,
        duration: 0.2,
        ease: 'power2.out',
      });
    }
  }, [slotIndex]);

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

        const target = classifyDrop(svgCoords, zoomRef.current, slotIndexRef.current);

        let handled = false;

        if (target.type === 'board') {
          handled = onDropOnBoardRef.current?.(target.row, target.col) ?? false;
        } else if (target.type === 'rack-slot') {
          onReorderRef.current?.(target.slotIndex);
          handled = true;
        }

        if (!handled) {
          gsap.to(el, {
            x: initPos.current.x,
            y: initPos.current.y,
            duration: 0.2,
            ease: 'power2.out',
          });
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

  const half = RACK_TILE_SIZE / 2;
  const fontSize = RACK_TILE_SIZE * 0.48;
  const ptsFontSize = RACK_TILE_SIZE * 0.2;

  return (
    <g
      ref={groupRef}
      data-tile-id={id}
      className={isBlank ? 'tile-blank' : undefined}
      style={{ cursor: 'grab' }}
      onPointerDown={(e) => e.stopPropagation()}
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
          x={RACK_TILE_SIZE - 6}
          y={RACK_TILE_SIZE - 6}
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
