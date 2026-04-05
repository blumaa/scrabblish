import { BOARD_PX } from '../../lib/svg-coords';

export const RACK_TILE_SIZE = 90;
export const RACK_GAP = 8;
export const RACK_SLOTS = 7;
export const RACK_TOTAL_W = RACK_SLOTS * RACK_TILE_SIZE + (RACK_SLOTS - 1) * RACK_GAP;
export const RACK_OFFSET_X = (BOARD_PX - RACK_TOTAL_W) / 2;
export const RACK_Y = BOARD_PX + 20;
export const TOTAL_HEIGHT = BOARD_PX + RACK_TILE_SIZE + 50;
