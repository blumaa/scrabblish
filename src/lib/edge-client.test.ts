import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callEdgeFunction } from './edge-client';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockRefreshSession = supabase.auth.refreshSession as ReturnType<typeof vi.fn>;
const mockSignOut = supabase.auth.signOut as ReturnType<typeof vi.fn>;

const validSession = { access_token: 'test-token' };

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mockFetch(200, { ok: true }));
});

describe('callEdgeFunction', () => {
  it('throws when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(callEdgeFunction('create-game', {})).rejects.toThrow('Not authenticated');
  });

  it('sends Authorization header via fetch', async () => {
    mockGetSession.mockResolvedValue({ data: { session: validSession } });
    const spy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'game-1' }), { status: 200 }));
    vi.stubGlobal('fetch', spy);

    const result = await callEdgeFunction('create-game', { languages: ['en'] });

    expect(result).toEqual({ id: 'game-1' });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/create-game'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    );
  });

  it('retries with refreshed token on 401', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'stale-token' } } });
    mockRefreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh-token' } } });

    const spy = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ hand: [] }), { status: 200 }));
    vi.stubGlobal('fetch', spy);

    const result = await callEdgeFunction('get-hand', { gameId: 'g1' });
    expect(result).toEqual({ hand: [] });
    expect(mockRefreshSession).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(
      expect.stringContaining('/functions/v1/get-hand'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fresh-token' }),
      })
    );
  });

  it('signs out and throws if refresh fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'stale-token' } } });
    mockRefreshSession.mockResolvedValue({ data: { session: null } });
    mockSignOut.mockResolvedValue({});

    vi.stubGlobal('fetch', mockFetch(401, { error: 'Unauthorized' }));

    await expect(callEdgeFunction('game-action', {})).rejects.toThrow('Session expired — please sign in again');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('throws actual error message from edge function', async () => {
    mockGetSession.mockResolvedValue({ data: { session: validSession } });
    vi.stubGlobal('fetch', mockFetch(403, { error: 'Not your turn' }));

    await expect(callEdgeFunction('game-action', { gameId: 'g1' })).rejects.toThrow('Not your turn');
  });

  it('throws message field from error body', async () => {
    mockGetSession.mockResolvedValue({ data: { session: validSession } });
    vi.stubGlobal('fetch', mockFetch(500, { message: 'Internal error' }));

    await expect(callEdgeFunction('game-action', {})).rejects.toThrow('Internal error');
  });

  it('returns data on success', async () => {
    mockGetSession.mockResolvedValue({ data: { session: validSession } });
    vi.stubGlobal('fetch', mockFetch(200, { hand: [{ id: 't1', letter: 'A', points: 1 }], tilesRemaining: 90 }));

    const result = await callEdgeFunction('get-hand', { gameId: 'g1' });
    expect(result).toEqual({
      hand: [{ id: 't1', letter: 'A', points: 1 }],
      tilesRemaining: 90,
    });
  });
});
