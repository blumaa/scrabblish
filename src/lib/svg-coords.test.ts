import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  svgCoordsToGridPosition,
  gridPositionToSvgCoords,
  svgCoordsToBoard,
  boardCoordsToSvg,
  CELL_SIZE,
} from './svg-coords';

describe('svg-coords', () => {
  describe('snapToGrid', () => {
    it('snaps to nearest grid cell center', () => {
      const result = snapToGrid(73, 128, CELL_SIZE);
      expect(result).toEqual({ x: 75, y: 125 });
    });

    it('snaps values at exact cell boundaries to the lower cell', () => {
      const result = snapToGrid(50, 100, CELL_SIZE);
      expect(result).toEqual({ x: 75, y: 125 });
    });

    it('snaps values near zero to first cell center', () => {
      const result = snapToGrid(12, 3, CELL_SIZE);
      expect(result).toEqual({ x: 25, y: 25 });
    });

    it('snaps values near max to last cell center', () => {
      const result = snapToGrid(740, 730, CELL_SIZE);
      expect(result).toEqual({ x: 725, y: 725 });
    });
  });

  describe('svgCoordsToGridPosition', () => {
    it('converts SVG coordinates to row/col', () => {
      const pos = svgCoordsToGridPosition(125, 75);
      expect(pos).toEqual({ row: 1, col: 2 });
    });

    it('converts origin area to 0,0', () => {
      const pos = svgCoordsToGridPosition(10, 10);
      expect(pos).toEqual({ row: 0, col: 0 });
    });

    it('converts max area to 14,14', () => {
      const pos = svgCoordsToGridPosition(740, 740);
      expect(pos).toEqual({ row: 14, col: 14 });
    });
  });

  describe('gridPositionToSvgCoords', () => {
    it('converts row/col to SVG center coordinates', () => {
      const coords = gridPositionToSvgCoords(0, 0);
      expect(coords).toEqual({ x: 25, y: 25 });
    });

    it('converts center of board correctly', () => {
      const coords = gridPositionToSvgCoords(7, 7);
      expect(coords).toEqual({ x: 375, y: 375 });
    });

    it('round-trips with svgCoordsToGridPosition', () => {
      const { x, y } = gridPositionToSvgCoords(5, 10);
      const pos = svgCoordsToGridPosition(x, y);
      expect(pos).toEqual({ row: 5, col: 10 });
    });
  });

  describe('svgCoordsToBoard', () => {
    it('returns same coords when not zoomed (scale=1, pan=0,0)', () => {
      const result = svgCoordsToBoard(375, 375, 1, 0, 0);
      expect(result).toEqual({ x: 375, y: 375 });
    });

    it('converts SVG coords to board coords when zoomed in', () => {
      // Zoomed 2.5x, panned to center (panX=225, panY=225)
      // SVG coord (375, 375) → board coord: 375 / 2.5 + 225 = 375
      const result = svgCoordsToBoard(375, 375, 2.5, 225, 225);
      expect(result.x).toBeCloseTo(375, 0);
      expect(result.y).toBeCloseTo(375, 0);
    });

    it('converts SVG coords at origin when panned', () => {
      // Zoomed 2.5x, panned to (200, 200)
      // SVG coord (0, 0) → board coord: 0 / 2.5 + 200 = 200
      const result = svgCoordsToBoard(0, 0, 2.5, 200, 200);
      expect(result.x).toBeCloseTo(200, 0);
      expect(result.y).toBeCloseTo(200, 0);
    });

    it('converts coords on right edge when zoomed', () => {
      // Zoomed 2.5x, panned to (300, 300)
      // SVG coord (750, 750) → board coord: 750 / 2.5 + 300 = 600
      const result = svgCoordsToBoard(750, 750, 2.5, 300, 300);
      expect(result.x).toBeCloseTo(600, 0);
      expect(result.y).toBeCloseTo(600, 0);
    });
  });

  describe('boardCoordsToSvg', () => {
    it('returns same coords when not zoomed (scale=1, pan=0,0)', () => {
      const result = boardCoordsToSvg(375, 375, 1, 0, 0);
      expect(result).toEqual({ x: 375, y: 375 });
    });

    it('converts board coords to SVG coords when zoomed', () => {
      // Board (375, 375) with scale=2.5, pan=(225, 225)
      // SVG = (375 - 225) * 2.5 = 150 * 2.5 = 375
      const result = boardCoordsToSvg(375, 375, 2.5, 225, 225);
      expect(result.x).toBeCloseTo(375, 0);
      expect(result.y).toBeCloseTo(375, 0);
    });

    it('converts board origin with pan offset', () => {
      // Board (200, 200) with scale=2.5, pan=(200, 200)
      // SVG = (200 - 200) * 2.5 = 0
      const result = boardCoordsToSvg(200, 200, 2.5, 200, 200);
      expect(result.x).toBeCloseTo(0, 0);
      expect(result.y).toBeCloseTo(0, 0);
    });

    it('round-trips with svgCoordsToBoard', () => {
      const boardX = 325;
      const boardY = 425;
      const scale = 2.5;
      const panX = 150;
      const panY = 200;

      const svgCoords = boardCoordsToSvg(boardX, boardY, scale, panX, panY);
      const backToBoard = svgCoordsToBoard(svgCoords.x, svgCoords.y, scale, panX, panY);

      expect(backToBoard.x).toBeCloseTo(boardX, 5);
      expect(backToBoard.y).toBeCloseTo(boardY, 5);
    });
  });
});
