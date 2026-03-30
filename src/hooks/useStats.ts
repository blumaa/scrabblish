import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { PlayerStats, LanguageStat } from '../types/stats';
import type { Language } from '../types/game';

export function useStats(userId: string | null) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [languageStats, setLanguageStats] = useState<LanguageStat[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [statsRes, langRes] = await Promise.all([
        supabase
          .from('player_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('player_language_stats')
          .select('*')
          .eq('user_id', userId)
          .order('words_played', { ascending: false }),
      ]);

      if (statsRes.data) {
        setStats({
          userId: statsRes.data.user_id,
          gamesPlayed: statsRes.data.games_played,
          wins: statsRes.data.wins,
          totalScore: statsRes.data.total_score,
          bestWordScore: statsRes.data.best_word_score,
          bestWord: statsRes.data.best_word,
          longestWord: statsRes.data.longest_word,
          currentWinStreak: statsRes.data.current_win_streak,
          bestWinStreak: statsRes.data.best_win_streak,
        });
      } else {
        setStats(null);
      }

      if (langRes.data) {
        setLanguageStats(
          langRes.data.map((row: { language: string; words_played: number }) => ({
            language: row.language as Language,
            wordsPlayed: row.words_played,
          })),
        );
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
      setStats(null);
      setLanguageStats([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  return { stats, languageStats, loading, refresh: loadStats };
}
