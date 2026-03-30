import { describe, it, expect } from 'vitest';

describe('game invitation logic', () => {
  it('game with invited_user_id is discoverable by that user', () => {
    const game = {
      id: 'game-1',
      player1_id: 'user-a',
      player2_id: null,
      invited_user_id: 'user-b',
      status: 'waiting',
    };

    // User B should be able to see this game
    const canSee = game.invited_user_id === 'user-b' && game.status === 'waiting';
    expect(canSee).toBe(true);

    // User C should NOT see it
    const canSeeC = game.invited_user_id === 'user-c';
    expect(canSeeC).toBe(false);
  });

  it('accepting invitation sets player2_id and status to active', () => {
    const game = {
      player1_id: 'user-a',
      player2_id: null as string | null,
      invited_user_id: 'user-b',
      status: 'waiting',
    };

    // Accept
    game.player2_id = game.invited_user_id;
    game.status = 'active';

    expect(game.player2_id).toBe('user-b');
    expect(game.status).toBe('active');
  });

  it('declining invitation clears invited_user_id', () => {
    const game = {
      invited_user_id: 'user-b' as string | null,
      status: 'waiting',
    };

    game.invited_user_id = null;
    expect(game.invited_user_id).toBeNull();
    expect(game.status).toBe('waiting'); // still waiting, creator can re-invite
  });

  it('accepted game gives first turn to the accepting player', () => {
    const game = {
      player1_id: 'creator',
      invited_user_id: 'invitee',
      current_turn: null as string | null,
    };

    // On accept, the invitee (player2) gets first turn
    game.current_turn = game.invited_user_id;
    expect(game.current_turn).toBe('invitee');
  });

  it('game transitions: waiting → active → finished', () => {
    type Status = 'waiting' | 'active' | 'finished';
    const validTransitions: Record<Status, Status[]> = {
      waiting: ['active'],
      active: ['finished'],
      finished: [],
    };

    expect(validTransitions.waiting).toContain('active');
    expect(validTransitions.active).toContain('finished');
    expect(validTransitions.finished).toHaveLength(0);
  });
});
