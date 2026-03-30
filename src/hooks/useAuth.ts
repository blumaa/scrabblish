import { useState, useEffect, useCallback } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, loading: false, error: null });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState((prev) => ({ ...prev, user: session?.user ?? null }));
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: username, username } },
    });
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: formatAuthError(error) }));
      return false;
    }
    setState((prev) => ({ ...prev, loading: false }));
    return true;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: formatAuthError(error) }));
      return false;
    }
    setState((prev) => ({ ...prev, loading: false }));
    return true;
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    await supabase.auth.signOut();
    setState({ user: null, loading: false, error: null });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: formatAuthError(error) }));
      return false;
    }
    setState((prev) => ({ ...prev, loading: false }));
    return true;
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    clearError,
  };
}

function formatAuthError(error: AuthError): string {
  // Never reveal if email exists — generic message for all auth failures
  if (error.message.includes('Invalid login credentials')) {
    return 'Invalid email or password';
  }
  if (error.message.includes('User already registered')) {
    return 'An account with this email already exists';
  }
  if (error.message.includes('Password should be')) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
