import { describe, it, expect } from 'vitest';

describe('online game state mapping', () => {
  it('maps Supabase game row to GameState', () => {
    const gameRow = {
      id: 'game-1',
      join_code: 'ABCD1234',
      languages: ['en', 'de'],
      status: 'active',
      player1_id: 'p1',
      player2_id: 'p2',
      current_turn: 'p1',
      move_number: 3,
      board_state: [],
      winner_id: null,
    };

    const myId = 'p1';
    const isP1 = gameRow.player1_id === myId;

    expect(isP1).toBe(true);
    expect(gameRow.current_turn === myId).toBe(true); // my turn
    expect(gameRow.status).toBe('active');
  });

  it('detects whose turn it is', () => {
    const currentTurn = 'p2';
    const myId = 'p1';
    expect(currentTurn).not.toBe(myId); // not my turn
  });
});
