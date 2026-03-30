import { CELL_SIZE } from '../../lib/svg-coords';
import type { Tile } from '../../types/game';
import './Rack.css';

interface RackProps {
  tiles: Tile[];
  selectedTileId: string | null;
  onSelectTile: (tileId: string | null) => void;
}

const RACK_SLOTS = 7;
const RACK_WIDTH = RACK_SLOTS * CELL_SIZE;
const RACK_HEIGHT = CELL_SIZE;

export function Rack({ tiles, selectedTileId, onSelectTile }: RackProps) {
  return (
    <div className="rack-wrapper">
      <svg
        viewBox={`0 0 ${RACK_WIDTH} ${RACK_HEIGHT}`}
        className="rack-svg"
      >
        {/* Empty slots */}
        {Array.from({ length: RACK_SLOTS }, (_, i) => (
          <rect
            key={`slot-${i}`}
            x={i * CELL_SIZE + 2}
            y={2}
            width={CELL_SIZE - 4}
            height={CELL_SIZE - 4}
            rx={4}
            className="rack-slot"
          />
        ))}

        {/* Tile letters */}
        {tiles.map((tile, i) => {
          const isSelected = tile.id === selectedTileId;
          const x = i * CELL_SIZE;
          return (
            <g
              key={tile.id}
              className={`rack-tile ${isSelected ? 'rack-tile-selected' : ''}`}
              onClick={() => onSelectTile(isSelected ? null : tile.id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x + 2}
                y={2}
                width={CELL_SIZE - 4}
                height={CELL_SIZE - 4}
                rx={4}
                className="tile-bg"
              />
              <text
                x={x + CELL_SIZE / 2}
                y={CELL_SIZE / 2 + 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="tile-letter"
              >
                {tile.letter}
              </text>
              {!tile.isBlank && (
                <text
                  x={x + CELL_SIZE - 8}
                  y={CELL_SIZE - 8}
                  textAnchor="end"
                  className="tile-points"
                >
                  {tile.points}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
