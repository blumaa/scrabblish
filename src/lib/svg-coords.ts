export const BOARD_SIZE = 15;
export const CELL_SIZE = 50;
export const BOARD_PX = BOARD_SIZE * CELL_SIZE; // 750

/**
 * Snap arbitrary SVG coordinates to the nearest grid cell center.
 */
export function snapToGrid(
  svgX: number,
  svgY: number,
  cellSize: number = CELL_SIZE
): { x: number; y: number } {
  const col = Math.floor(clamp(svgX, 0, BOARD_PX - 1) / cellSize);
  const row = Math.floor(clamp(svgY, 0, BOARD_PX - 1) / cellSize);
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2,
  };
}

/**
 * Convert SVG pixel coordinates to grid row/col (0-indexed).
 */
export function svgCoordsToGridPosition(
  svgX: number,
  svgY: number
): { row: number; col: number } {
  return {
    row: Math.floor(clamp(svgY, 0, BOARD_PX - 1) / CELL_SIZE),
    col: Math.floor(clamp(svgX, 0, BOARD_PX - 1) / CELL_SIZE),
  };
}

/**
 * Convert grid row/col to SVG coordinates (center of cell).
 */
export function gridPositionToSvgCoords(
  row: number,
  col: number
): { x: number; y: number } {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}

/**
 * Convert screen (client) coordinates to SVG user-space coordinates
 * using the SVG element's Current Transformation Matrix.
 */
export function screenToSvgCoords(
  svgEl: SVGSVGElement,
  screenX: number,
  screenY: number
): { x: number; y: number } {
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: screenX, y: screenY };
  const inverseCTM = ctm.inverse();
  return {
    x: inverseCTM.a * screenX + inverseCTM.c * screenY + inverseCTM.e,
    y: inverseCTM.b * screenX + inverseCTM.d * screenY + inverseCTM.f,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
