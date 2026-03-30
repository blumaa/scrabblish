import { useReducer, useCallback, useRef } from 'react';
import { BOARD_PX } from '../../lib/svg-coords';

export type GestureState =
  | 'IDLE'
  | 'PAN_CANDIDATE'
  | 'PANNING'
  | 'TILE_DRAGGING';

interface ViewportState {
  // Zoom: 1 = full board, 2.5 = zoomed in (~6x6 cells visible)
  scale: number;
  // Pan offset in SVG units (applied before scale)
  panX: number;
  panY: number;
  gestureState: GestureState;
  dragLocked: boolean;
}

type ViewportAction =
  | { type: 'ZOOM_TO'; x: number; y: number; scale: number; force?: boolean }
  | { type: 'ZOOM_OUT' }
  | { type: 'PAN_TO'; panX: number; panY: number }
  | { type: 'SET_GESTURE'; state: GestureState }
  | { type: 'LOCK_DRAG' }
  | { type: 'UNLOCK_DRAG' };

const MIN_SCALE = 1;
const MAX_SCALE = 2.5;

function clampPan(panX: number, panY: number, scale: number): { panX: number; panY: number } {
  // When zoomed in, the visible area is BOARD_PX / scale wide.
  // Pan range: 0 to BOARD_PX - (BOARD_PX / scale)
  const maxPan = BOARD_PX - BOARD_PX / scale;
  return {
    panX: Math.max(0, Math.min(maxPan, panX)),
    panY: Math.max(0, Math.min(maxPan, panY)),
  };
}

function viewportReducer(state: ViewportState, action: ViewportAction): ViewportState {
  switch (action.type) {
    case 'ZOOM_TO': {
      if (state.dragLocked && !action.force) return state;
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, action.scale));
      // Center the zoom on the target point
      const visibleW = BOARD_PX / scale;
      const panX = action.x - visibleW / 2;
      const panY = action.y - visibleW / 2;
      const clamped = clampPan(panX, panY, scale);
      return { ...state, scale, panX: clamped.panX, panY: clamped.panY };
    }
    case 'ZOOM_OUT':
      if (state.dragLocked) return state;
      return { ...state, scale: 1, panX: 0, panY: 0 };
    case 'PAN_TO': {
      if (state.dragLocked) return state;
      const clamped = clampPan(action.panX, action.panY, state.scale);
      return { ...state, panX: clamped.panX, panY: clamped.panY };
    }
    case 'SET_GESTURE':
      return { ...state, gestureState: action.state };
    case 'LOCK_DRAG':
      return { ...state, dragLocked: true, gestureState: 'TILE_DRAGGING' };
    case 'UNLOCK_DRAG':
      return { ...state, dragLocked: false, gestureState: 'IDLE' };
    default:
      return state;
  }
}

const initialState: ViewportState = {
  scale: 1,
  panX: 0,
  panY: 0,
  gestureState: 'IDLE',
  dragLocked: false,
};

export function useBoardViewport() {
  const [state, dispatch] = useReducer(viewportReducer, initialState);
  const lastTapRef = useRef(0);
  const panStartRef = useRef<{ screenX: number; screenY: number; panX: number; panY: number } | null>(null);

  const isZoomedIn = state.scale > 1.1;
  const boardTransform = buildTransformString(state.scale, state.panX, state.panY);

  const handleDoubleTap = useCallback((svgX: number, svgY: number) => {
    if (state.dragLocked) return;
    if (isZoomedIn) {
      dispatch({ type: 'ZOOM_OUT' });
    } else {
      dispatch({ type: 'ZOOM_TO', x: svgX, y: svgY, scale: MAX_SCALE });
    }
  }, [isZoomedIn, state.dragLocked]);

  const zoomToPosition = useCallback((svgX: number, svgY: number) => {
    dispatch({ type: 'ZOOM_TO', x: svgX, y: svgY, scale: MAX_SCALE, force: true });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (state.dragLocked) return;

    // Skip if pointer is on a tile
    const target = e.target as Element;
    if (target.closest?.('[data-tile-id]')) return;

    // Check if the pointer is in the board area (not rack)
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const inv = ctm.inverse();
    const svgY = inv.b * e.clientX + inv.d * e.clientY + inv.f;
    if (svgY >= BOARD_PX) return; // Click in rack area — ignore for pan/zoom

    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const svgX = inv.a * e.clientX + inv.c * e.clientY + inv.e;
      // Convert screen-space SVG coords to board-space coords (account for current zoom)
      const boardX = svgX / state.scale + state.panX;
      const boardY = svgY / state.scale + state.panY;
      handleDoubleTap(boardX, boardY);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    // Start pan if zoomed in
    if (isZoomedIn) {
      panStartRef.current = {
        screenX: e.clientX,
        screenY: e.clientY,
        panX: state.panX,
        panY: state.panY,
      };
      dispatch({ type: 'SET_GESTURE', state: 'PAN_CANDIDATE' });
    }
  }, [state.dragLocked, state.scale, state.panX, state.panY, isZoomedIn, handleDoubleTap]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!panStartRef.current) return;
    if (state.gestureState !== 'PAN_CANDIDATE' && state.gestureState !== 'PANNING') return;
    if (state.dragLocked) return;

    const svg = e.currentTarget;
    // Convert screen pixel movement to SVG unit movement
    const svgUnitsPerPixel = BOARD_PX / svg.clientWidth;
    const dx = -(e.clientX - panStartRef.current.screenX) * svgUnitsPerPixel / state.scale;
    const dy = -(e.clientY - panStartRef.current.screenY) * svgUnitsPerPixel / state.scale;

    dispatch({
      type: 'PAN_TO',
      panX: panStartRef.current.panX + dx,
      panY: panStartRef.current.panY + dy,
    });
    dispatch({ type: 'SET_GESTURE', state: 'PANNING' });
  }, [state.gestureState, state.dragLocked, state.scale]);

  const handlePointerUp = useCallback(() => {
    panStartRef.current = null;
    if (state.gestureState === 'PANNING' || state.gestureState === 'PAN_CANDIDATE') {
      dispatch({ type: 'SET_GESTURE', state: 'IDLE' });
    }
  }, [state.gestureState]);

  const lockDrag = useCallback(() => dispatch({ type: 'LOCK_DRAG' }), []);
  const unlockDrag = useCallback(() => dispatch({ type: 'UNLOCK_DRAG' }), []);

  return {
    scale: state.scale,
    panX: state.panX,
    panY: state.panY,
    isZoomedIn,
    gestureState: state.gestureState,
    dragLocked: state.dragLocked,
    boardTransform,
    lockDrag,
    unlockDrag,
    zoomToPosition,
    dispatch,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

export function buildTransformString(
  scale: number,
  panX: number,
  panY: number
): string | undefined {
  if (scale === 1 && panX === 0 && panY === 0) return undefined;
  // Use scale-then-translate form so panX, panY, and scale are independent
  // in the transform string — this allows smooth linear interpolation by GSAP
  // without the non-linear multiplication artifact of translate(-panX*scale, ...) scale(s)
  return `scale(${scale}) translate(${-panX}, ${-panY})`;
}
