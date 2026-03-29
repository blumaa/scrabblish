import { useReducer, useRef, useCallback } from 'react';
import { Board } from './components/board/Board';
import { DraggableTile } from './components/board/DraggableTile';
import { CELL_SIZE } from './lib/svg-coords';

interface TileState {
  id: string;
  letter: string;
  points: number;
  row: number;
  col: number;
}

interface SpikeState {
  tiles: TileState[];
  moveCount: number;
  lastAction: string;
}

type SpikeAction =
  | { type: 'TILE_DROPPED'; tileId: string; row: number; col: number }
  | { type: 'TILE_DRAG_START'; tileId: string }
  | { type: 'RESET' };

const initialTiles: TileState[] = [
  { id: 'S', letter: 'S', points: 1, row: 7, col: 5 },
  { id: 'P', letter: 'P', points: 3, row: 7, col: 6 },
  { id: 'I', letter: 'I', points: 1, row: 7, col: 7 },
  { id: 'K', letter: 'K', points: 5, row: 7, col: 8 },
  { id: 'E', letter: 'E', points: 1, row: 7, col: 9 },
];

const initialState: SpikeState = {
  tiles: initialTiles,
  moveCount: 0,
  lastAction: 'None',
};

function spikeReducer(state: SpikeState, action: SpikeAction): SpikeState {
  switch (action.type) {
    case 'TILE_DRAG_START':
      return { ...state, lastAction: `Dragging ${action.tileId}` };
    case 'TILE_DROPPED': {
      const tiles = state.tiles.map((t) =>
        t.id === action.tileId ? { ...t, row: action.row, col: action.col } : t
      );
      return {
        ...state,
        tiles,
        moveCount: state.moveCount + 1,
        lastAction: `Dropped ${action.tileId} at (${action.row}, ${action.col})`,
      };
    }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(spikeReducer, initialState);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDragStart = useCallback(
    (tileId: string) => {
      dispatch({ type: 'TILE_DRAG_START', tileId });
    },
    []
  );

  const handleDrop = useCallback(
    (tileId: string, row: number, col: number) => {
      dispatch({ type: 'TILE_DROPPED', tileId, row, col });
    },
    []
  );

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>
        Scrabblish — Phase 0 Spike
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666' }}>
        Drag tiles on the board. Double-tap to zoom in/out.
        Pan by dragging empty board area when zoomed in.
        useReducer re-renders on every action ({state.moveCount} moves).
      </p>

      <Board svgRef={svgRef}>
        {(viewport) => (
          <g id="tiles">
            {state.tiles.map((tile) => (
              <DraggableTile
                key={tile.id}
                id={tile.id}
                letter={tile.letter}
                points={tile.points}
                initialX={tile.col * CELL_SIZE + CELL_SIZE / 2}
                initialY={tile.row * CELL_SIZE + CELL_SIZE / 2}
                svgRef={svgRef}
                onLockViewport={viewport.lockDrag}
                onUnlockViewport={viewport.unlockDrag}
                onDragStart={() => handleDragStart(tile.id)}
                onDrop={(row, col) => handleDrop(tile.id, row, col)}
              />
            ))}
          </g>
        )}
      </Board>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#f5f5f5',
          borderRadius: 4,
          fontSize: 13,
          fontFamily: 'monospace',
        }}
      >
        <div><strong>Moves:</strong> {state.moveCount}</div>
        <div><strong>Last Action:</strong> {state.lastAction}</div>
        <div><strong>Tile Positions:</strong></div>
        {state.tiles.map((t) => (
          <div key={t.id} style={{ marginLeft: 16 }}>
            {t.letter} ({t.points}pt) → row={t.row} col={t.col}
          </div>
        ))}
        <button onClick={() => dispatch({ type: 'RESET' })} style={{ marginTop: 8 }}>
          Reset Tiles
        </button>
      </div>
    </div>
  );
}
