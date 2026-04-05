import { svgCoordsToBoard, snapToGrid, CELL_SIZE, BOARD_PX } from '../../lib/svg-coords';
import { RACK_TILE_SIZE, RACK_GAP, RACK_SLOTS, RACK_OFFSET_X, RACK_Y } from './rack-constants';

export type DropTarget =
  | { type: 'board'; row: number; col: number }
  | { type: 'rack-slot'; slotIndex: number }
  | { type: 'snap-back' };

export function classifyDrop(
  svgCoords: { x: number; y: number },
  zoomState: { scale: number; panX: number; panY: number },
  currentSlotIndex: number,
): DropTarget {
  const { x, y } = svgCoords;

  // Board area: y < BOARD_PX and within board bounds
  if (y >= 0 && y < BOARD_PX && x >= 0 && x < BOARD_PX) {
    const boardCoords = svgCoordsToBoard(x, y, zoomState.scale, zoomState.panX, zoomState.panY);
    const snapped = snapToGrid(boardCoords.x, boardCoords.y, CELL_SIZE);
    const col = Math.floor(snapped.x / CELL_SIZE);
    const row = Math.floor(snapped.y / CELL_SIZE);
    return { type: 'board', row, col };
  }

  // Rack area: within rack vertical bounds
  if (y >= RACK_Y && y < RACK_Y + RACK_TILE_SIZE) {
    const relativeX = x - RACK_OFFSET_X;
    const slotWidth = RACK_TILE_SIZE + RACK_GAP;
    const targetSlot = Math.floor(relativeX / slotWidth);

    if (targetSlot >= 0 && targetSlot < RACK_SLOTS && targetSlot !== currentSlotIndex) {
      return { type: 'rack-slot', slotIndex: targetSlot };
    }
  }

  return { type: 'snap-back' };
}
