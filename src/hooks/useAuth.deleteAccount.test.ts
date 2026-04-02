import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('../lib/edge-client', () => ({
  callEdgeFunction: vi.fn(),
}));

import { supabase } from '../lib/supabase';
import { callEdgeFunction } from '../lib/edge-client';

const mockSignOut = supabase.auth.signOut as ReturnType<typeof vi.fn>;
const mockCallEdge = callEdgeFunction as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAuth.deleteAccount', () => {
  it('calls delete-account edge function with empty body', async () => {
    mockCallEdge.mockResolvedValue({});

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(mockCallEdge).toHaveBeenCalledWith('delete-account', {});
  });

  it('signs out after successful deletion', async () => {
    mockCallEdge.mockResolvedValue({});

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('returns true on success', async () => {
    mockCallEdge.mockResolvedValue({});

    const { result } = renderHook(() => useAuth());

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.deleteAccount();
    });

    expect(returnValue).toBe(true);
  });

  it('clears user state on success', async () => {
    mockCallEdge.mockResolvedValue({});

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns false when edge function throws', async () => {
    mockCallEdge.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useAuth());

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.deleteAccount();
    });

    expect(returnValue).toBe(false);
  });

  it('sets error message when edge function throws', async () => {
    mockCallEdge.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(result.current.error).toBe('Failed to delete account. Please try again.');
  });

  it('does not sign out when edge function throws', async () => {
    mockCallEdge.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
