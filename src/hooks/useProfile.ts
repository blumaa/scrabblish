import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        // Profile doesn't exist yet — will be created by trigger on next signup
        setProfile(null);
        return;
      }

      setProfile({
        id: data.id,
        displayName: data.display_name,
        username: data.username ?? '',
        avatarUrl: data.avatar_url,
      });
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const updateProfile = useCallback(async (updates: Partial<Pick<Profile, 'displayName' | 'username' | 'avatarUrl'>>): Promise<boolean> => {
    if (!userId) return false;
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.username !== undefined) {
        dbUpdates.username = updates.username;
        dbUpdates.display_name = updates.username; // keep in sync
      }
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);

      if (error) {
        console.error('Profile update failed:', error.message);
        throw error;
      }
      await loadProfile();
      return true;
    } catch (err) {
      console.error('Profile update error:', err);
      return false;
    }
  }, [userId, loadProfile]);

  return { profile, loading, updateProfile, refresh: loadProfile };
}
