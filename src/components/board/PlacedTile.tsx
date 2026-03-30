import { memo } from 'react';
import { CELL_SIZE } from '../../lib/svg-coords';
import type { PlacedTile as PlacedTileType } from '../../types/game';

interface PlacedTileProps {
  tile: PlacedTileType;
  isPending?: boolean;
  onRecall?: (tileId: string) => void;
}

export const PlacedTileComponent = memo(function PlacedTileComponent({
  tile,
  isPending = false,
  onRecall,
}: PlacedTileProps) {
  const x = tile.col * CELL_SIZE;
  const y = tile.row * CELL_SIZE;
  const className = [
    'placed-tile',
    isPending && 'tile-pending',
    tile.isBlank && 'tile-blank',
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (isPending && onRecall) {
      onRecall(tile.id);
    }
  };

  return (
    <g
      className={className}
      transform={`translate(${x}, ${y})`}
      onClick={handleClick}
      style={{ cursor: isPending ? 'pointer' : 'default' }}
    >
      <rect
        width={CELL_SIZE - 4}
        height={CELL_SIZE - 4}
        x={2}
        y={2}
        rx={4}
        className="tile-bg"
      />
      <text
        x={CELL_SIZE / 2}
        y={CELL_SIZE / 2 + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="tile-letter"
      >
        {tile.letter}
      </text>
      {!tile.isBlank && (
        <text
          x={CELL_SIZE - 8}
          y={CELL_SIZE - 8}
          textAnchor="end"
          className="tile-points"
        >
          {tile.points}
        </text>
      )}
    </g>
  );
});
