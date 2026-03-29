import { useReducer, useCallback, useRef } from 'react';

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GestureState =
  | 'IDLE'
  | 'PAN_CANDIDATE'
  | 'PANNING'
  | 'PINCHING'
  | 'TILE_DRAGGING';

interface ViewportState {
  viewBox: ViewBox;
  gestureState: GestureState;
  isZoomedIn: boolean;
  dragLocked: boolean; // viewBox is frozen during tile drag
}

type ViewportAction =
  | { type: 'ZOOM_IN'; focusX: number; focusY: number }
  | { type: 'ZOOM_OUT' }
  | { type: 'SET_VIEWBOX'; viewBox: ViewBox }
  | { type: 'PAN'; dx: number; dy: number }
  | { type: 'SET_GESTURE'; state: GestureState }
  | { type: 'LOCK_DRAG' }
  | { type: 'UNLOCK_DRAG' };

const FULL_VIEWBOX: ViewBox = { x: 0, y: 0, width: 750, height: 750 };
const ZOOM_SIZE = 300; // ~6x6 cells visible when zoomed in

function clampViewBox(vb: ViewBox): ViewBox {
  const maxX = 750 - vb.width;
  const maxY = 750 - vb.height;
  return {
    ...vb,
    x: Math.max(0, Math.min(maxX, vb.x)),
    y: Math.max(0, Math.min(maxY, vb.y)),
  };
}

function viewportReducer(state: ViewportState, action: ViewportAction): ViewportState {
  switch (action.type) {
    case 'ZOOM_IN': {
      if (state.dragLocked) return state;
      const vb: ViewBox = {
        x: action.focusX - ZOOM_SIZE / 2,
        y: action.focusY - ZOOM_SIZE / 2,
        width: ZOOM_SIZE,
        height: ZOOM_SIZE,
      };
      return { ...state, viewBox: clampViewBox(vb), isZoomedIn: true };
    }
    case 'ZOOM_OUT':
      if (state.dragLocked) return state;
      return { ...state, viewBox: FULL_VIEWBOX, isZoomedIn: false };
    case 'SET_VIEWBOX':
      if (state.dragLocked) return state;
      return { ...state, viewBox: clampViewBox(action.viewBox) };
    case 'PAN': {
      if (state.dragLocked) return state;
      const vb = {
        ...state.viewBox,
        x: state.viewBox.x + action.dx,
        y: state.viewBox.y + action.dy,
      };
      return { ...state, viewBox: clampViewBox(vb) };
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
  viewBox: FULL_VIEWBOX,
  gestureState: 'IDLE',
  isZoomedIn: false,
  dragLocked: false,
};

export function useBoardViewport() {
  const [state, dispatch] = useReducer(viewportReducer, initialState);
  const lastTapRef = useRef(0);
  const panStartRef = useRef<{ x: number; y: number; vbX: number; vbY: number } | null>(null);

  const viewBoxString = `${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.width} ${state.viewBox.height}`;

  const handleDoubleTap = useCallback((svgX: number, svgY: number) => {
    if (state.dragLocked) return;
    if (state.isZoomedIn) {
      dispatch({ type: 'ZOOM_OUT' });
    } else {
      dispatch({ type: 'ZOOM_IN', focusX: svgX, focusY: svgY });
    }
  }, [state.isZoomedIn, state.dragLocked]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (state.dragLocked) return;

    // Check if the pointer landed on a draggable tile — if so, skip pan.
    // Walk up from the event target to find a [data-tile-id] ancestor.
    const target = e.target as Element;
    const tileEl = target.closest?.('[data-tile-id]');
    if (tileEl) return; // Let GSAP Draggable handle this pointer, don't pan

    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      const svg = e.currentTarget;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const inv = ctm.inverse();
        const svgX = inv.a * e.clientX + inv.c * e.clientY + inv.e;
        const svgY = inv.b * e.clientX + inv.d * e.clientY + inv.f;
        handleDoubleTap(svgX, svgY);
      }
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    // Start pan candidate (only on empty board area)
    if (state.isZoomedIn) {
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        vbX: state.viewBox.x,
        vbY: state.viewBox.y,
      };
      dispatch({ type: 'SET_GESTURE', state: 'PAN_CANDIDATE' });
    }
  }, [state.dragLocked, state.isZoomedIn, state.viewBox.x, state.viewBox.y, handleDoubleTap]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!panStartRef.current) return;
    if (state.gestureState !== 'PAN_CANDIDATE' && state.gestureState !== 'PANNING') return;
    if (state.dragLocked) return;

    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    // Scale factor: how many SVG units per screen pixel
    const scale = state.viewBox.width / svg.clientWidth;
    const dx = -(e.clientX - panStartRef.current.x) * scale;
    const dy = -(e.clientY - panStartRef.current.y) * scale;

    dispatch({
      type: 'SET_VIEWBOX',
      viewBox: {
        ...state.viewBox,
        x: panStartRef.current.vbX + dx,
        y: panStartRef.current.vbY + dy,
      },
    });
    dispatch({ type: 'SET_GESTURE', state: 'PANNING' });
  }, [state.gestureState, state.dragLocked, state.viewBox]);

  const handlePointerUp = useCallback(() => {
    panStartRef.current = null;
    if (state.gestureState === 'PANNING' || state.gestureState === 'PAN_CANDIDATE') {
      dispatch({ type: 'SET_GESTURE', state: 'IDLE' });
    }
  }, [state.gestureState]);

  const lockDrag = useCallback(() => dispatch({ type: 'LOCK_DRAG' }), []);
  const unlockDrag = useCallback(() => dispatch({ type: 'UNLOCK_DRAG' }), []);

  return {
    viewBox: state.viewBox,
    viewBoxString,
    isZoomedIn: state.isZoomedIn,
    gestureState: state.gestureState,
    dragLocked: state.dragLocked,
    lockDrag,
    unlockDrag,
    dispatch,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
