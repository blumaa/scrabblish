import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  svgCoordsToGridPosition,
  gridPositionToSvgCoords,
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
});
