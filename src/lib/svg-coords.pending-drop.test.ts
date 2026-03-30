import { describe, it, expect } from 'vitest';
import { svgCoordsToBoard, snapToGrid, CELL_SIZE } from './svg-coords';

describe('pending tile drop with zoom', () => {
  it('converts drop coords correctly when not zoomed', () => {
    // No zoom: scale=1, pan=0,0. SVG coords = board coords
    const board = svgCoordsToBoard(375, 375, 1, 0, 0);
    const snapped = snapToGrid(board.x, board.y, CELL_SIZE);
    expect(snapped).toEqual({ x: 375, y: 375 }); // center of cell 7,7
  });

  it('converts drop coords correctly when zoomed and panned', () => {
    // Zoomed 2.5x at center (pan 225, 225)
    // A pending tile inside the zoom group at SVG position (375, 375)
    // is actually at board position: already in board-space since it's inside the <g>
    // So for PENDING tiles we should NOT apply the zoom conversion
    const boardX = 375;
    const boardY = 375;
    const snapped = snapToGrid(boardX, boardY, CELL_SIZE);
    expect(snapped).toEqual({ x: 375, y: 375 });
  });

  it('rack tile drop converts through zoom correctly', () => {
    // Rack tile is OUTSIDE the zoom group
    // When zoomed 2.5x with pan (225, 225):
    // SVG coord (375, 375) → board coord: 375/2.5 + 225 = 375
    const board = svgCoordsToBoard(375, 375, 2.5, 225, 225);
    const snapped = snapToGrid(board.x, board.y, CELL_SIZE);
    expect(snapped).toEqual({ x: 375, y: 375 });
  });

  it('rack tile at SVG origin maps to panned board position', () => {
    // Zoomed 2.5x, panned to (200, 200)
    // SVG coord (0, 0) → board: 0/2.5 + 200 = 200
    const board = svgCoordsToBoard(0, 0, 2.5, 200, 200);
    const snapped = snapToGrid(board.x, board.y, CELL_SIZE);
    // board (200, 200) → cell 4,4 → center (225, 225)
    expect(snapped).toEqual({ x: 225, y: 225 });
  });
});
