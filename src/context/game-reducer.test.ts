import { describe, it, expect } from 'vitest';
import { gameReducer, initialGameState, getBoardWithPending, isMyTurn, isFirstMove, isGameOver } from './game-reducer';
import type { GameState, Tile } from '../types/game';

function makeTile(letter: string, id?: string): Tile {
  return { id: id ?? `${letter}-0`, letter, points: 1, isBlank: false };
}

function setupActiveGame(): GameState {
  return {
    ...initialGameState,
    gameId: 'game-1',
    myPlayerId: 'p1',
    player1: { id: 'p1', displayName: 'Player 1', rack: [makeTile('A'), makeTile('B'), makeTile('C')], score: 0 },
    player2: { id: 'p2', displayName: 'Player 2', rack: [], score: 0 },
    currentTurnPlayerId: 'p1',
    status: 'active',
  };
}

describe('gameReducer', () => {
  describe('PLACE_TILE', () => {
    it('moves tile from rack to pendingTiles', () => {
      const state = setupActiveGame();
      const tileA = state.player1.rack[0];

      const next = gameReducer(state, {
        type: 'PLACE_TILE',
        tile: tileA,
        position: { row: 7, col: 7 },
      });

      expect(next.player1.rack.length).toBe(2);
      expect(next.player1.rack.find((t) => t.id === tileA.id)).toBeUndefined();
      expect(next.pendingTiles.length).toBe(1);
      expect(next.pendingTiles[0].row).toBe(7);
      expect(next.pendingTiles[0].col).toBe(7);
    });

  });

  describe('RECALL_TILE', () => {
    it('moves tile from pendingTiles back to rack', () => {
      let state = setupActiveGame();
      const tileA = state.player1.rack[0];

      state = gameReducer(state, {
        type: 'PLACE_TILE',
        tile: tileA,
        position: { row: 7, col: 7 },
      });

      expect(state.pendingTiles.length).toBe(1);

      state = gameReducer(state, { type: 'RECALL_TILE', tileId: tileA.id });

      expect(state.pendingTiles.length).toBe(0);
      expect(state.player1.rack.length).toBe(3);
      expect(state.player1.rack.find((t) => t.id === tileA.id)).toBeDefined();
    });

    it('returns tile to its original rack position', () => {
      let state = setupActiveGame();
      // Rack is [A, B, C]. Place B (index 1).
      const tileB = state.player1.rack[1];

      state = gameReducer(state, {
        type: 'PLACE_TILE',
        tile: tileB,
        position: { row: 7, col: 7 },
      });

      expect(state.player1.rack.map((t) => t.letter)).toEqual(['A', 'C']);

      state = gameReducer(state, { type: 'RECALL_TILE', tileId: tileB.id });

      expect(state.player1.rack.map((t) => t.letter)).toEqual(['A', 'B', 'C']);
    });

    it('handles multiple recalls back to correct positions', () => {
      let state = setupActiveGame();
      const [tileA, tileB, tileC] = state.player1.rack;

      // Place all three
      state = gameReducer(state, { type: 'PLACE_TILE', tile: tileA, position: { row: 7, col: 5 } });
      state = gameReducer(state, { type: 'PLACE_TILE', tile: tileB, position: { row: 7, col: 6 } });
      state = gameReducer(state, { type: 'PLACE_TILE', tile: tileC, position: { row: 7, col: 7 } });

      expect(state.player1.rack.length).toBe(0);

      // Recall in reverse order
      state = gameReducer(state, { type: 'RECALL_TILE', tileId: tileC.id });
      state = gameReducer(state, { type: 'RECALL_TILE', tileId: tileA.id });
      state = gameReducer(state, { type: 'RECALL_TILE', tileId: tileB.id });

      expect(state.player1.rack.map((t) => t.letter)).toEqual(['A', 'B', 'C']);
    });
  });

  describe('MOVE_PENDING_TILE', () => {
    it('moves a pending tile to a new board position', () => {
      let state = setupActiveGame();
      const tileA = state.player1.rack[0];

      state = gameReducer(state, {
        type: 'PLACE_TILE',
        tile: tileA,
        position: { row: 7, col: 7 },
      });

      expect(state.pendingTiles[0].row).toBe(7);
      expect(state.pendingTiles[0].col).toBe(7);

      state = gameReducer(state, {
        type: 'MOVE_PENDING_TILE',
        tileId: tileA.id,
        position: { row: 5, col: 5 },
      });

      expect(state.pendingTiles.length).toBe(1);
      expect(state.pendingTiles[0].row).toBe(5);
      expect(state.pendingTiles[0].col).toBe(5);
      // Rack should NOT change
      expect(state.player1.rack.length).toBe(2);
    });

    it('does not affect other pending tiles', () => {
      let state = setupActiveGame();
      const [tileA, tileB] = state.player1.rack;

      state = gameReducer(state, {
        type: 'PLACE_TILE',
        tile: tileA,
        position: { row: 7, col: 7 },
      });
      state = gameReducer(state, {
        type: 'PLACE_TILE',
        tile: tileB,
        position: { row: 7, col: 8 },
      });

      state = gameReducer(state, {
        type: 'MOVE_PENDING_TILE',
        tileId: tileA.id,
        position: { row: 3, col: 3 },
      });

      expect(state.pendingTiles.length).toBe(2);
      const movedA = state.pendingTiles.find((t) => t.id === tileA.id)!;
      const unchangedB = state.pendingTiles.find((t) => t.id === tileB.id)!;
      expect(movedA.row).toBe(3);
      expect(movedA.col).toBe(3);
      expect(unchangedB.row).toBe(7);
      expect(unchangedB.col).toBe(8);
    });

    it('is a no-op if tile not found in pending', () => {
      const state = setupActiveGame();
      const next = gameReducer(state, {
        type: 'MOVE_PENDING_TILE',
        tileId: 'nonexistent',
        position: { row: 0, col: 0 },
      });
      expect(next).toBe(state);
    });
  });

  describe('MOVE_SUBMITTED', () => {
    it('sets rack to updatedHand tiles', () => {
      let state = setupActiveGame();
      const newHand = [makeTile('X', 'X-0'), makeTile('Y', 'Y-0'), makeTile('Z', 'Z-0'),
                       makeTile('W', 'W-0'), makeTile('V', 'V-0'), makeTile('U', 'U-0'),
                       makeTile('T', 'T-0')];
      state = gameReducer(state, {
        type: 'MOVE_SUBMITTED',
        updatedHand: newHand,
        moveNumber: 1,
      });
      expect(state.player1.rack).toEqual(newHand);
      expect(state.player1.rack.length).toBe(7);
    });

    it('clears pending tiles and rackOrder', () => {
      let state = setupActiveGame();
      state = gameReducer(state, {
        type: 'PLACE_TILE',
        tile: state.player1.rack[0],
        position: { row: 7, col: 7 },
      });
      expect(state.pendingTiles.length).toBe(1);
      expect(state.rackOrder.length).toBeGreaterThan(0);

      state = gameReducer(state, {
        type: 'MOVE_SUBMITTED',
        updatedHand: [makeTile('X'), makeTile('Y'), makeTile('Z')],
        moveNumber: 1,
      });
      expect(state.pendingTiles.length).toBe(0);
      expect(state.rackOrder.length).toBe(0);
    });
  });

  describe('game over detection', () => {
    it('returns false when bag has tiles', () => {
      const state = setupActiveGame();
      expect(isGameOver({ ...state, tilesRemaining: 50 })).toBe(false);
    });

    it('returns false when bag empty but both players have tiles', () => {
      const state = {
        ...setupActiveGame(),
        player2: { id: 'p2', displayName: 'Player 2', rack: [makeTile('D'), makeTile('E')], score: 0 },
      };
      expect(isGameOver({ ...state, tilesRemaining: 0 })).toBe(false);
    });

    it('returns true when bag empty and a player has no tiles', () => {
      const state = {
        ...setupActiveGame(),
        tilesRemaining: 0,
        player1: { ...setupActiveGame().player1, rack: [] },
      };
      expect(isGameOver(state)).toBe(true);
    });
  });

  describe('SHUFFLE_RACK', () => {
    it('changes the order of rack tiles', () => {
      const state = setupActiveGame();
      const originalOrder = state.player1.rack.map((t) => t.id);

      // Shuffle many times — at least one should differ
      let foundDifferent = false;
      for (let i = 0; i < 20; i++) {
        const shuffled = gameReducer(state, { type: 'SHUFFLE_RACK' });
        const newOrder = shuffled.player1.rack.map((t) => t.id);
        if (JSON.stringify(newOrder) !== JSON.stringify(originalOrder)) {
          foundDifferent = true;
          break;
        }
      }
      expect(foundDifferent).toBe(true);
    });

    it('preserves all tiles', () => {
      const state = setupActiveGame();
      const shuffled = gameReducer(state, { type: 'SHUFFLE_RACK' });
      expect(shuffled.player1.rack.length).toBe(state.player1.rack.length);
      const originalIds = new Set(state.player1.rack.map((t) => t.id));
      const shuffledIds = new Set(shuffled.player1.rack.map((t) => t.id));
      expect(shuffledIds).toEqual(originalIds);
    });
  });

  describe('RECALL_ALL_TILES', () => {
    it('returns all pending tiles to rack', () => {
      let state = setupActiveGame();
      const tiles = [...state.player1.rack];

      for (let i = 0; i < tiles.length; i++) {
        state = gameReducer(state, {
          type: 'PLACE_TILE',
          tile: tiles[i],
          position: { row: 7, col: 7 + i },
        });
      }

      expect(state.player1.rack.length).toBe(0);
      expect(state.pendingTiles.length).toBe(3);

      state = gameReducer(state, { type: 'RECALL_ALL_TILES' });

      expect(state.player1.rack.length).toBe(3);
      expect(state.pendingTiles.length).toBe(0);
    });
  });

  describe('SYNC_STATE', () => {
    it('overwrites board from server without affecting pending tiles', () => {
      let state = setupActiveGame();

      // Place a tile locally
      state = gameReducer(state, {
        type: 'PLACE_TILE',
        tile: state.player1.rack[0],
        position: { row: 7, col: 7 },
      });

      expect(state.pendingTiles.length).toBe(1);

      // Server sync arrives — board is updated but pending stays
      const serverBoard = state.board; // still empty
      state = gameReducer(state, {
        type: 'SYNC_STATE',
        board: serverBoard,
        moveNumber: 1,
        currentTurn: 'p2',
        player1Score: 10,
        player2Score: 0,
        tilesRemaining: 90,
        winnerId: null,
        status: 'active',
      });

      // Pending tiles survive the sync
      expect(state.pendingTiles.length).toBe(1);
      expect(state.player1.score).toBe(10);
      expect(state.moveNumber).toBe(1);
    });
  });

  describe('MOVE_SUBMITTED', () => {
    it('clears pending tiles and updates hand', () => {
      let state = setupActiveGame();
      state = gameReducer(state, {
        type: 'PLACE_TILE',
        tile: state.player1.rack[0],
        position: { row: 7, col: 7 },
      });

      const newHand = [makeTile('X', 'X-0'), makeTile('Y', 'Y-0')];
      state = gameReducer(state, {
        type: 'MOVE_SUBMITTED',
        updatedHand: newHand,
        moveNumber: 1,
      });

      expect(state.pendingTiles.length).toBe(0);
      expect(state.player1.rack).toEqual(newHand);
      expect(state.moveNumber).toBe(1);
    });
  });
});

describe('getBoardWithPending', () => {
  it('returns board with pending tiles overlaid', () => {
    let state = setupActiveGame();
    state = gameReducer(state, {
      type: 'PLACE_TILE',
      tile: state.player1.rack[0],
      position: { row: 7, col: 7 },
    });

    const combined = getBoardWithPending(state);
    expect(combined[7][7]).not.toBeNull();
    expect(combined[7][7]!.letter).toBe('A');

    // Original board unchanged
    expect(state.board[7][7]).toBeNull();
  });
});

describe('isMyTurn', () => {
  it('returns true when it is my turn', () => {
    const state = setupActiveGame();
    expect(isMyTurn(state)).toBe(true);
  });

  it('returns false when it is not my turn', () => {
    const state = { ...setupActiveGame(), currentTurnPlayerId: 'p2' };
    expect(isMyTurn(state)).toBe(false);
  });
});

describe('isFirstMove', () => {
  it('returns true when moveNumber is 0', () => {
    expect(isFirstMove(setupActiveGame())).toBe(true);
  });

  it('returns false when moveNumber > 0', () => {
    const state = { ...setupActiveGame(), moveNumber: 3 };
    expect(isFirstMove(state)).toBe(false);
  });
});
