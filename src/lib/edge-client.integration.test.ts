import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * Integration test — hits the REAL Supabase Edge Functions.
 * Tests that auth tokens are properly sent and accepted.
 * Uses test accounts created via admin API.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const TEST_USER = {
  email: 'test1@scrabblish.app',
  password: 'testpass123456',
};

const hasCredentials = SUPABASE_URL && SUPABASE_ANON_KEY;

describe.skipIf(!hasCredentials)('Edge Function integration (real HTTP)', () => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  let accessToken: string | null = null;

  beforeAll(async () => {
    const { error } = await supabase.auth.signInWithPassword(TEST_USER);
    if (error) {
      console.warn('Sign in failed:', error.message);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token ?? null;
  });

  it('signs in and gets a valid JWT access token', () => {
    expect(accessToken).toBeTruthy();
    expect(accessToken!.split('.').length).toBe(3);
  });

  it('create-game succeeds with valid auth token (no 401)', async () => {
    expect(accessToken).toBeTruthy();

    const { data, error } = await supabase.functions.invoke('create-game', {
      body: { languages: ['en'] },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Log error for debugging
    if (error) {
      console.error('create-game error:', JSON.stringify(error));
    }

    // Must NOT be 401 / Unauthorized
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.id).toBeTruthy();
    expect(data.joinCode).toBeTruthy();
  });

  it('get-hand succeeds for a game the user owns', async () => {
    expect(accessToken).toBeTruthy();

    // First create a game
    const { data: game } = await supabase.functions.invoke('create-game', {
      body: { languages: ['en'] },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(game?.id).toBeTruthy();

    // Then get the hand
    const { data, error } = await supabase.functions.invoke('get-hand', {
      body: { gameId: game.id },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error) {
      expect(error.message).not.toContain('Unauthorized');
      expect(error.message).not.toContain('401');
    }

    expect(data).toBeTruthy();
    expect(data.hand).toBeDefined();
    expect(Array.isArray(data.hand)).toBe(true);
    expect(data.hand.length).toBe(7);
    expect(data.tilesRemaining).toBeDefined();
  });

  it('create-game fails without auth token', async () => {
    // Call directly with fetch — no Authorization header at all
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ languages: ['en'] }),
    });

    // Should get 401 from our function's auth check
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});
