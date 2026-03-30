import { memo } from 'react';
import { getSquareType } from '../../constants/board';
import { CELL_SIZE } from '../../lib/svg-coords';
import type { SquareType } from '../../types/game';

const LABELS: Partial<Record<SquareType, string>> = {
  DL: 'DL',
  TL: 'TL',
  DW: 'DW',
  TW: 'TW',
};

interface SquareProps {
  row: number;
  col: number;
}

export const Square = memo(function Square({ row, col }: SquareProps) {
  const type = getSquareType(row, col);
  const x = col * CELL_SIZE;
  const y = row * CELL_SIZE;
  const label = LABELS[type];

  return (
    <>
      <rect
        x={x}
        y={y}
        width={CELL_SIZE}
        height={CELL_SIZE}
        className={`sq-${type} sq-border`}
      />
      {label && (
        <text
          x={x + CELL_SIZE / 2}
          y={y + CELL_SIZE / 2 + 3}
          textAnchor="middle"
          className={`sq-label sq-label-${type}`}
        >
          {label}
        </text>
      )}
      {type === 'star' && (
        <text
          x={x + CELL_SIZE / 2}
          y={y + CELL_SIZE / 2 + 6}
          textAnchor="middle"
          className="star-marker"
        >
          ★
        </text>
      )}
    </>
  );
});
