import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callEdgeFunction } from './edge-client';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('callEdgeFunction', () => {
  it('throws when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(callEdgeFunction('create-game', {})).rejects.toThrow('Not authenticated');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('passes Authorization header with session access_token', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token-abc' } },
    });
    mockInvoke.mockResolvedValue({ data: { id: 'game-1' }, error: null });

    const result = await callEdgeFunction('create-game', { languages: ['en'] });

    expect(result).toEqual({ id: 'game-1' });
    expect(mockInvoke).toHaveBeenCalledWith('create-game', {
      body: { languages: ['en'] },
      headers: { Authorization: 'Bearer test-token-abc' },
    });
  });

  it('throws on Edge Function error response', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Game not found' },
    });

    await expect(callEdgeFunction('get-hand', { gameId: 'bad' })).rejects.toEqual({
      message: 'Game not found',
    });
  });

  it('returns data on success', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    mockInvoke.mockResolvedValue({
      data: { hand: [{ id: 't1', letter: 'A', points: 1 }], tilesRemaining: 90 },
      error: null,
    });

    const result = await callEdgeFunction('get-hand', { gameId: 'g1' });
    expect(result).toEqual({
      hand: [{ id: 't1', letter: 'A', points: 1 }],
      tilesRemaining: 90,
    });
  });
});
