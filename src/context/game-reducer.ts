import type { GameState, GameAction, Board, Tile, PlacedTile, PlayerState } from '../types/game';
import { createEmptyBoard } from '../lib/board-utils';

function emptyPlayer(id: string = '', displayName: string = ''): PlayerState {
  return { id, displayName, rack: [], score: 0 };
}

export const initialGameState: GameState = {
  gameId: null,
  joinCode: null,
  languages: ['en', 'de'],
  status: 'waiting',
  myPlayerId: null,

  board: createEmptyBoard(),
  player1: emptyPlayer(),
  player2: emptyPlayer(),
  currentTurnPlayerId: null,
  moveNumber: 0,
  consecutivePasses: 0,
  tilesRemaining: 0,
  winnerId: null,

  pendingTiles: [],
  rackOrder: [],
  lastPlay: null,
  dictionaryLoaded: false,
  syncing: false,
  error: null,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_GAME':
      return {
        ...state,
        gameId: action.gameId,
        joinCode: action.joinCode,
        languages: action.languages,
      };

    case 'SET_MY_PLAYER':
      return { ...state, myPlayerId: action.playerId };

    case 'SET_HAND': {
      const me = getMyPlayer(state);
      if (!me) return state;
      return updateMyPlayer(state, { ...me, rack: action.tiles });
    }

    case 'SYNC_STATE':
      return {
        ...state,
        board: action.board,
        moveNumber: action.moveNumber,
        currentTurnPlayerId: action.currentTurn,
        player1: { ...state.player1, score: action.player1Score },
        player2: { ...state.player2, score: action.player2Score },
        tilesRemaining: action.tilesRemaining,
        winnerId: action.winnerId,
        status: action.status,
      };

    case 'PLACE_TILE': {
      const me = getMyPlayer(state);
      if (!me) return state;

      // Snapshot rack order on first placement this turn
      const rackOrder = state.rackOrder.length === 0
        ? me.rack.map((t) => t.id)
        : state.rackOrder;

      const tileToPlace: PlacedTile = {
        ...action.tile,
        row: action.position.row,
        col: action.position.col,
      };

      const newRack = me.rack.filter((t) => t.id !== action.tile.id);
      const newPending = [...state.pendingTiles, tileToPlace];

      return {
        ...updateMyPlayer(state, { ...me, rack: newRack }),
        pendingTiles: newPending,
        rackOrder,
      };
    }

    case 'MOVE_PENDING_TILE': {
      const tile = state.pendingTiles.find((t) => t.id === action.tileId);
      if (!tile) return state;

      const newPending = state.pendingTiles.map((t) =>
        t.id === action.tileId
          ? { ...t, row: action.position.row, col: action.position.col }
          : t
      );

      return { ...state, pendingTiles: newPending };
    }

    case 'SHUFFLE_RACK': {
      const me = getMyPlayer(state);
      if (!me) return state;
      const shuffled = [...me.rack].sort(() => Math.random() - 0.5);
      return {
        ...updateMyPlayer(state, { ...me, rack: shuffled }),
        // Reset rackOrder so recall uses new shuffled order
        rackOrder: [],
      };
    }

    case 'RECALL_TILE': {
      const me = getMyPlayer(state);
      if (!me) return state;

      const recalled = state.pendingTiles.find((t) => t.id === action.tileId);
      if (!recalled) return state;

      const returnedTile: Tile = {
        id: recalled.id,
        letter: recalled.letter,
        points: recalled.points,
        isBlank: recalled.isBlank,
      };

      // Rebuild rack using original order
      const newRack = rebuildRack([...me.rack, returnedTile], state.rackOrder);
      const newPending = state.pendingTiles.filter((t) => t.id !== action.tileId);

      return {
        ...updateMyPlayer(state, { ...me, rack: newRack }),
        pendingTiles: newPending,
        // Clear rackOrder if all tiles are back
        rackOrder: newPending.length === 0 ? [] : state.rackOrder,
      };
    }

    case 'RECALL_ALL_TILES': {
      const me = getMyPlayer(state);
      if (!me) return state;

      const returnedTiles: Tile[] = state.pendingTiles.map((t) => ({
        id: t.id, letter: t.letter, points: t.points, isBlank: t.isBlank,
      }));

      const newRack = rebuildRack([...me.rack, ...returnedTiles], state.rackOrder);

      return {
        ...updateMyPlayer(state, { ...me, rack: newRack }),
        pendingTiles: [],
        rackOrder: [],
      };
    }

    case 'SET_LAST_PLAY':
      return {
        ...state,
        lastPlay: { playerName: action.playerName, words: action.words, score: action.score },
      };

    case 'MOVE_SUBMITTED': {
      const me = getMyPlayer(state);
      if (!me) return state;
      return {
        ...updateMyPlayer(state, { ...me, rack: action.updatedHand }),
        pendingTiles: [],
        rackOrder: [],
        moveNumber: action.moveNumber,
      };
    }

    case 'MOVE_ERROR':
      return { ...state, error: action.error, syncing: false };

    case 'DICTIONARY_LOADED':
      return { ...state, dictionaryLoaded: true };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_SYNCING':
      return { ...state, syncing: action.syncing };

    default:
      return state;
  }
}

/**
 * Rebuild rack in original order. Tiles not in the order list go at the end.
 */
function rebuildRack(tiles: Tile[], originalOrder: string[]): Tile[] {
  if (originalOrder.length === 0) return tiles;

  const tileMap = new Map(tiles.map((t) => [t.id, t]));
  const ordered: Tile[] = [];

  for (const id of originalOrder) {
    const tile = tileMap.get(id);
    if (tile) {
      ordered.push(tile);
      tileMap.delete(id);
    }
  }

  // Append any tiles not in the original order (shouldn't happen, but defensive)
  for (const tile of tileMap.values()) {
    ordered.push(tile);
  }

  return ordered;
}

export function getBoardWithPending(state: GameState): Board {
  const board = state.board.map((row) => [...row]);
  for (const t of state.pendingTiles) {
    board[t.row][t.col] = t;
  }
  return board;
}

export function isMyTurn(state: GameState): boolean {
  return state.currentTurnPlayerId === state.myPlayerId;
}

export function isFirstMove(state: GameState): boolean {
  return state.board.every((row) => row.every((cell) => cell === null));
}

export function isGameOver(state: GameState): boolean {
  if (state.tilesRemaining > 0) return false;
  return state.player1.rack.length === 0 || state.player2.rack.length === 0;
}

function getMyPlayer(state: GameState): PlayerState | null {
  if (state.myPlayerId === state.player1.id) return state.player1;
  if (state.myPlayerId === state.player2.id) return state.player2;
  return null;
}

function updateMyPlayer(state: GameState, player: PlayerState): GameState {
  if (state.myPlayerId === state.player1.id) {
    return { ...state, player1: player };
  }
  if (state.myPlayerId === state.player2.id) {
    return { ...state, player2: player };
  }
  return state;
}
