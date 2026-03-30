export type Language = 'en' | 'de';

export type SquareType = 'normal' | 'DL' | 'TL' | 'DW' | 'TW' | 'star';

export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  id: string;
  letter: string;
  points: number;
  isBlank: boolean;
}

export interface PlacedTile extends Tile {
  row: number;
  col: number;
}

export interface TileDefinition {
  letter: string;
  points: number;
  count: number;
}

export type MoveType = 'place' | 'exchange' | 'pass';

export interface WordFormed {
  word: string;
  score: number;
  language: Language | null; // null = not yet checked
  tiles: PlacedTile[];
}

export interface Move {
  playerId: string;
  moveNumber: number;
  type: MoveType;
  tilesPlaced?: PlacedTile[];
  wordsFormed?: WordFormed[];
  score: number;
  tilesExchangedCount?: number;
  timestamp: string;
}

export interface PlayerState {
  id: string;
  displayName: string;
  rack: Tile[];
  score: number;
}

export type GameStatus = 'waiting' | 'active' | 'finished';

export type Board = (PlacedTile | null)[][];

export interface GameState {
  gameId: string | null;
  joinCode: string | null;
  languages: Language[];
  status: GameStatus;
  myPlayerId: string | null;

  board: Board;
  player1: PlayerState;
  player2: PlayerState;
  currentTurnPlayerId: string | null;
  moveNumber: number;
  consecutivePasses: number;
  tilesRemaining: number;
  winnerId: string | null;

  // Client-only
  pendingTiles: PlacedTile[];
  rackOrder: string[]; // original tile IDs in rack order, for recall reinsertion
  lastPlay: { playerName: string; words: string[]; score: number } | null;
  dictionaryLoaded: boolean;
  syncing: boolean;
  error: string | null;
}

export type GameAction =
  // Connection
  | { type: 'SET_GAME'; gameId: string; joinCode: string; languages: Language[] }
  | { type: 'SYNC_STATE'; board: Board; moveNumber: number; currentTurn: string | null; player1Score: number; player2Score: number; tilesRemaining: number; winnerId: string | null; status: GameStatus }
  | { type: 'SET_MY_PLAYER'; playerId: string }
  | { type: 'SET_HAND'; tiles: Tile[] }

  // Tile placement (client-side pending)
  | { type: 'PLACE_TILE'; tile: Tile; position: Position }
  | { type: 'MOVE_PENDING_TILE'; tileId: string; position: Position }
  | { type: 'RECALL_TILE'; tileId: string }
  | { type: 'RECALL_ALL_TILES' }
  | { type: 'SHUFFLE_RACK' }

  // Turn results (from server)
  | { type: 'SET_LAST_PLAY'; playerName: string; words: string[]; score: number }
  | { type: 'MOVE_SUBMITTED'; updatedHand: Tile[]; moveNumber: number }
  | { type: 'MOVE_ERROR'; error: string }

  // Dictionary
  | { type: 'DICTIONARY_LOADED' }

  // UI
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_SYNCING'; syncing: boolean };

export const BOARD_SIZE = 15;
