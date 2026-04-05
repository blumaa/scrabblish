import { describe, it, expect } from 'vitest';
import { classifyDrop } from './classify-drop';

describe('classifyDrop', () => {
  const defaultZoom = { scale: 1, panX: 0, panY: 0 };

  describe('board drops', () => {
    it('classifies a drop in the board area', () => {
      const result = classifyDrop({ x: 125, y: 125 }, defaultZoom, 0);
      expect(result.type).toBe('board');
      if (result.type === 'board') {
        expect(result.row).toBe(2);
        expect(result.col).toBe(2);
      }
    });

    it('classifies drop at board origin', () => {
      const result = classifyDrop({ x: 25, y: 25 }, defaultZoom, 0);
      expect(result.type).toBe('board');
      if (result.type === 'board') {
        expect(result.row).toBe(0);
        expect(result.col).toBe(0);
      }
    });

    it('classifies drop at bottom-right of board', () => {
      const result = classifyDrop({ x: 725, y: 725 }, defaultZoom, 0);
      expect(result.type).toBe('board');
      if (result.type === 'board') {
        expect(result.row).toBe(14);
        expect(result.col).toBe(14);
      }
    });

    it('accounts for zoom when classifying board drop', () => {
      // At 2x zoom: boardCoord = svgCoord/scale + panX
      // To hit board center (375,375): panX = 375 - 375/2 = 187.5
      const zoom = { scale: 2, panX: 187.5, panY: 187.5 };
      const result = classifyDrop({ x: 375, y: 375 }, zoom, 0);
      expect(result.type).toBe('board');
      if (result.type === 'board') {
        expect(result.row).toBe(7);
        expect(result.col).toBe(7);
      }
    });
  });

  describe('rack slot drops', () => {
    it('classifies a drop on rack slot 0', () => {
      // RACK_OFFSET_X = 36, RACK_Y = 770, RACK_TILE_SIZE = 90
      const result = classifyDrop({ x: 60, y: 810 }, defaultZoom, 3);
      expect(result.type).toBe('rack-slot');
      if (result.type === 'rack-slot') {
        expect(result.slotIndex).toBe(0);
      }
    });

    it('classifies a drop on rack slot 6', () => {
      // Slot 6: x = 36 + 6 * 98 = 36 + 588 = 624
      const result = classifyDrop({ x: 660, y: 810 }, defaultZoom, 0);
      expect(result.type).toBe('rack-slot');
      if (result.type === 'rack-slot') {
        expect(result.slotIndex).toBe(6);
      }
    });

    it('returns snap-back when dropped on same slot', () => {
      const result = classifyDrop({ x: 60, y: 810 }, defaultZoom, 0);
      expect(result.type).toBe('snap-back');
    });
  });

  describe('snap-back', () => {
    it('returns snap-back for area between board and rack', () => {
      // y = 755 is between board (750) and rack (770)
      const result = classifyDrop({ x: 375, y: 755 }, defaultZoom, 0);
      expect(result.type).toBe('snap-back');
    });

    it('returns snap-back for area below rack', () => {
      const result = classifyDrop({ x: 375, y: 900 }, defaultZoom, 0);
      expect(result.type).toBe('snap-back');
    });

    it('returns snap-back for area left of rack slots', () => {
      const result = classifyDrop({ x: 10, y: 810 }, defaultZoom, 0);
      expect(result.type).toBe('snap-back');
    });

    it('returns snap-back for negative coordinates', () => {
      const result = classifyDrop({ x: -10, y: -10 }, defaultZoom, 0);
      expect(result.type).toBe('snap-back');
    });
  });
});
