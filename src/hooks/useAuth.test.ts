import { describe, it, expect, vi } from 'vitest';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

const mockResetPassword = supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>;

describe('password reset', () => {
  it('calls supabase.auth.resetPasswordForEmail with email', async () => {
    mockResetPassword.mockResolvedValue({ data: {}, error: null });

    const { error } = await supabase.auth.resetPasswordForEmail('test@example.com');
    expect(error).toBeNull();
    expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
  });

  it('returns error on failure', async () => {
    mockResetPassword.mockResolvedValue({
      data: null,
      error: { message: 'Rate limit exceeded' },
    });

    const { error } = await supabase.auth.resetPasswordForEmail('test@example.com');
    expect(error).toBeTruthy();
    expect(error!.message).toBe('Rate limit exceeded');
  });
});
