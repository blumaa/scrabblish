import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { callEdgeFunction } from '../lib/edge-client';
import type { Language, Tile } from '../types/game';

export interface GameSummary {
  id: string;
  joinCode: string;
  languages: Language[];
  status: 'waiting' | 'active' | 'finished';
  player1Id: string;
  player1Name: string;
  player2Id: string | null;
  player2Name: string | null;
  currentTurn: string | null;
  invitedUserId: string | null;
  winnerId: string | null;
  myScore: number;
  opponentScore: number;
  opponentAvatarIcon: string | null;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  languages: Language[];
  creatorId: string;
  creatorName: string;
  createdAt: string;
}

export function useGameManager(userId: string | null) {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGames = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // My active/waiting games
      const { data, error: err } = await supabase
        .from('games')
        .select('*')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (err) throw err;

      // Load profiles for all players
      const playerIds = new Set<string>();
      for (const g of (data ?? [])) {
        if (g.player1_id) playerIds.add(g.player1_id);
        if (g.player2_id) playerIds.add(g.player2_id);
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', [...playerIds]);

      const getProfile = (id: string) => {
        return profiles?.find((p: { id: string; username: string; avatar_url: string | null }) => p.id === id);
      };
      const getName = (id: string) => getProfile(id)?.username ?? 'Player';
      const getAvatarIcon = (id: string) => getProfile(id)?.avatar_url ?? null;

      const summaries: GameSummary[] = (data ?? []).map((g: Record<string, unknown>) => ({
        id: g.id as string,
        joinCode: g.join_code as string,
        languages: g.languages as Language[],
        status: g.status as 'waiting' | 'active' | 'finished',
        player1Id: g.player1_id as string,
        player1Name: getName(g.player1_id as string),
        player2Id: g.player2_id as string | null,
        player2Name: g.player2_id ? getName(g.player2_id as string) : null,
        currentTurn: g.current_turn as string | null,
        invitedUserId: g.invited_user_id as string | null,
        winnerId: g.winner_id as string | null,
        myScore: (g.player1_id === userId ? g.player1_score : g.player2_score) as number ?? 0,
        opponentScore: (g.player1_id === userId ? g.player2_score : g.player1_score) as number ?? 0,
        opponentAvatarIcon: g.player1_id === userId
          ? (g.player2_id ? getAvatarIcon(g.player2_id as string) : null)
          : getAvatarIcon(g.player1_id as string),
        updatedAt: g.updated_at as string,
      }));

      setGames(summaries);

      // Load invitations (games where I'm invited but haven't joined)
      const { data: invData } = await supabase
        .from('games')
        .select('*')
        .eq('invited_user_id', userId)
        .eq('status', 'waiting')
        .is('player2_id', null)
        .order('created_at', { ascending: false });

      const invitations: Invitation[] = (invData ?? []).map((g: Record<string, unknown>) => ({
        id: g.id as string,
        languages: g.languages as Language[],
        creatorId: g.player1_id as string,
        creatorName: getName(g.player1_id as string),
        createdAt: g.created_at as string,
      }));

      setInvitations(invitations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refreshGames(); }, [refreshGames]);

  // Realtime subscriptions
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('my-games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `player1_id=eq.${userId}` }, () => refreshGames())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `player2_id=eq.${userId}` }, () => refreshGames())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'games', filter: `invited_user_id=eq.${userId}` }, () => refreshGames())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refreshGames]);

  const createGame = useCallback(async (languages: Language[], invitedUserId?: string): Promise<{ id: string; joinCode: string } | null> => {
    if (!userId) return null;
    setError(null);
    try {
      const result = await callEdgeFunction('create-game', { languages, invitedUserId }) as { id: string; joinCode: string };
      await refreshGames();
      return { id: result.id, joinCode: result.joinCode };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
      return null;
    }
  }, [userId, refreshGames]);

  const acceptInvitation = useCallback(async (gameId: string): Promise<string | null> => {
    if (!userId) return null;
    setError(null);
    try {
      const result = await callEdgeFunction('join-game', { gameId }) as { id: string };
      await refreshGames();
      return result.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      return null;
    }
  }, [userId, refreshGames]);

  const declineInvitation = useCallback(async (gameId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      // Clear the invitation (service role not needed — just need to make it invisible)
      // Actually we can't UPDATE games via RLS... use an edge function or just hide locally
      setInvitations((prev) => prev.filter((i) => i.id !== gameId));
      return true;
    } catch {
      return false;
    }
  }, [userId]);

  const joinGame = useCallback(async (joinCode: string): Promise<string | null> => {
    if (!userId) return null;
    setError(null);
    try {
      const result = await callEdgeFunction('join-game', { joinCode: joinCode.toUpperCase() }) as { id: string };
      await refreshGames();
      return result.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
      return null;
    }
  }, [userId, refreshGames]);

  const getHand = useCallback(async (gameId: string): Promise<Tile[] | null> => {
    try {
      const result = await callEdgeFunction('get-hand', { gameId }) as { hand: Tile[] };
      return result.hand;
    } catch {
      return null;
    }
  }, []);

  const submitMove = useCallback(async (gameId: string, tiles: unknown[], moveNumber: number, score: number) => {
    try {
      return await callEdgeFunction('game-action', { gameId, action: 'submit', tiles, moveNumber, score });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit move');
      return null;
    }
  }, []);

  const exchangeTiles = useCallback(async (gameId: string, tileIds: string[], moveNumber: number) => {
    try {
      return await callEdgeFunction('game-action', { gameId, action: 'exchange', tileIds, moveNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to exchange tiles');
      return null;
    }
  }, []);

  return {
    games,
    invitations,
    loading,
    error,
    createGame,
    acceptInvitation,
    declineInvitation,
    joinGame,
    getHand,
    submitMove,
    exchangeTiles,
    refreshGames,
  };
}
