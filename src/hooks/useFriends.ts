import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Friend {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export function useFriends(userId: string | null) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Get friend relationships where I'm either user_id or friend_id
      const { data, error: err } = await supabase
        .from('friends')
        .select('id, user_id, friend_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (err) throw err;

      // Get the other user's profile for each friendship
      const friendUserIds = (data ?? []).map((f) =>
        f.user_id === userId ? f.friend_id : f.user_id
      );

      if (friendUserIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', friendUserIds);

      if (profileErr) throw profileErr;

      const friendList: Friend[] = (profiles ?? []).map((p) => ({
        id: data!.find((f) => (f.user_id === userId ? f.friend_id : f.user_id) === p.id)?.id ?? '',
        userId: p.id,
        displayName: p.display_name,
        username: p.username ?? '',
        avatarUrl: p.avatar_url,
      }));

      setFriends(friendList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const searchUsers = useCallback(async (query: string): Promise<Friend[]> => {
    if (query.length < 2) return [];
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('id', userId)
        .limit(10);

      if (err) throw err;

      return (data ?? []).map((p) => ({
        id: '',
        userId: p.id,
        displayName: p.display_name,
        username: p.username ?? '',
        avatarUrl: p.avatar_url,
      }));
    } catch {
      return [];
    }
  }, [userId]);

  const addFriend = useCallback(async (friendUserId: string): Promise<boolean> => {
    if (!userId) return false;
    setError(null);
    try {
      // Check if already friends
      const existing = friends.find((f) => f.userId === friendUserId);
      if (existing) {
        setError('Already friends');
        return false;
      }

      const { error: err } = await supabase
        .from('friends')
        .insert({ user_id: userId, friend_id: friendUserId });

      if (err) throw err;
      await loadFriends();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add friend');
      return false;
    }
  }, [userId, friends, loadFriends]);

  const removeFriend = useCallback(async (friendshipId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (err) throw err;
      await loadFriends();
      return true;
    } catch {
      return false;
    }
  }, [loadFriends]);

  return { friends, loading, error, searchUsers, addFriend, removeFriend, refresh: loadFriends };
}
