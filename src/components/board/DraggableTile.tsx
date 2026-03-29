import { useRef, useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { screenToSvgCoords, snapToGrid, CELL_SIZE } from '../../lib/svg-coords';

gsap.registerPlugin(Draggable);

interface DraggableTileProps {
  id: string;
  letter: string;
  points: number;
  initialX: number;
  initialY: number;
  svgRef: RefObject<SVGSVGElement | null>;
  onLockViewport?: () => void;
  onUnlockViewport?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (svgX: number, svgY: number) => void;
  onDrop?: (row: number, col: number) => void;
}

export function DraggableTile({
  id,
  letter,
  points,
  initialX,
  initialY,
  svgRef,
  onLockViewport,
  onUnlockViewport,
  onDragStart,
  onDragEnd,
  onDrop,
}: DraggableTileProps) {
  const groupRef = useRef<SVGGElement>(null);
  const draggableRef = useRef<Draggable | null>(null);

  // Use refs for callbacks so GSAP closures always see latest values
  // (React 19 StrictMode double-mount safe)
  const onLockViewportRef = useRef(onLockViewport);
  onLockViewportRef.current = onLockViewport;
  const onUnlockViewportRef = useRef(onUnlockViewport);
  onUnlockViewportRef.current = onUnlockViewport;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const svgRefRef = useRef(svgRef);
  svgRefRef.current = svgRef;

  // Stable initial position (doesn't change after mount)
  const initPos = useRef({ x: initialX - CELL_SIZE / 2, y: initialY - CELL_SIZE / 2 });

  useLayoutEffect(() => {
    const el = groupRef.current;
    if (!el) return;

    // Set initial transform via GSAP
    gsap.set(el, { x: initPos.current.x, y: initPos.current.y });

    const [instance] = Draggable.create(el, {
      type: 'x,y',
      onDragStart() {
        onLockViewportRef.current?.();
        onDragStartRef.current?.();
      },
      onDragEnd() {
        const svg = svgRefRef.current.current;
        if (!svg) return;

        const rect = el.getBoundingClientRect();
        const centerScreenX = rect.left + rect.width / 2;
        const centerScreenY = rect.top + rect.height / 2;

        const svgCoords = screenToSvgCoords(svg, centerScreenX, centerScreenY);
        const snapped = snapToGrid(svgCoords.x, svgCoords.y, CELL_SIZE);

        // Animate snap to grid
        gsap.to(el, {
          x: snapped.x - CELL_SIZE / 2,
          y: snapped.y - CELL_SIZE / 2,
          duration: 0.15,
          ease: 'power3.out',
        });

        onDragEndRef.current?.(snapped.x, snapped.y);

        const col = Math.floor(snapped.x / CELL_SIZE);
        const row = Math.floor(snapped.y / CELL_SIZE);
        onDropRef.current?.(row, col);

        onUnlockViewportRef.current?.();
      },
    });

    draggableRef.current = instance;

    return () => {
      instance.kill();
      draggableRef.current = null;
      // Reset transform so React StrictMode re-mount can re-apply cleanly
      gsap.set(el, { clearProps: 'all' });
    };
    // Empty deps: only run on mount/unmount. Callbacks accessed via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <g ref={groupRef} data-tile-id={id} style={{ cursor: 'grab' }}>
      <rect
        width={CELL_SIZE - 4}
        height={CELL_SIZE - 4}
        x={2}
        y={2}
        rx={4}
        fill="#f5e6c8"
        stroke="#8b7355"
        strokeWidth={1.5}
      />
      <text
        x={CELL_SIZE / 2}
        y={CELL_SIZE / 2 + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={24}
        fontWeight="bold"
        fontFamily="Georgia, serif"
        fill="#2c1810"
        pointerEvents="none"
      >
        {letter}
      </text>
      <text
        x={CELL_SIZE - 8}
        y={CELL_SIZE - 8}
        textAnchor="end"
        fontSize={10}
        fill="#6b5b4a"
        pointerEvents="none"
      >
        {points}
      </text>
    </g>
  );
}
