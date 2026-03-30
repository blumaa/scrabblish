/**
 * Computes and persists player stats when a game finishes.
 * Idempotent via the `stats_computed` flag on the games table.
 */

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

interface WordFormed {
  word: string;
  score: number;
}

interface MoveRow {
  player_id: string;
  move_type: string;
  score: number;
  words_formed: WordFormed[] | null;
}

export async function computeStats(
  supabase: SupabaseClient,
  gameId: string,
): Promise<{ success: boolean; error?: string }> {
  // Load game
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameErr || !game) {
    return { success: false, error: 'Game not found' };
  }

  // Idempotency guard
  if (game.stats_computed) {
    return { success: true };
  }

  if (game.status !== 'finished') {
    return { success: false, error: 'Game not finished' };
  }

  // Load all moves
  const { data: moves, error: movesErr } = await supabase
    .from('moves')
    .select('player_id, move_type, score, words_formed')
    .eq('game_id', gameId)
    .order('move_number', { ascending: true });

  if (movesErr) {
    return { success: false, error: `Failed to load moves: ${movesErr.message}` };
  }

  const typedMoves = (moves ?? []) as MoveRow[];
  const p1Id = game.player1_id;
  const p2Id = game.player2_id;
  const languages = game.languages as string[];

  // Extract stats for each player
  for (const playerId of [p1Id, p2Id]) {
    if (!playerId) continue;

    const isP1 = playerId === p1Id;
    const totalScore = isP1 ? (game.player1_score ?? 0) : (game.player2_score ?? 0);
    const isWinner = game.winner_id === playerId;
    const isDraw = game.winner_id === null;

    // Find best word and longest word
    let bestWord: string | null = null;
    let bestWordScore = 0;
    let longestWord: string | null = null;
    let totalWordsPlayed = 0;

    for (const m of typedMoves) {
      if (m.player_id !== playerId || m.move_type !== 'place' || !m.words_formed) continue;
      for (const w of m.words_formed) {
        totalWordsPlayed++;
        if (w.score > bestWordScore) {
          bestWordScore = w.score;
          bestWord = w.word;
        }
        if (!longestWord || w.word.length > longestWord.length) {
          longestWord = w.word;
        }
      }
    }

    // Upsert player_stats
    // First try to get existing stats for streak calculation
    const { data: existing } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', playerId)
      .maybeSingle();

    const prevGamesPlayed = existing?.games_played ?? 0;
    const prevWins = existing?.wins ?? 0;
    const prevTotalScore = existing?.total_score ?? 0;
    const prevBestWordScore = existing?.best_word_score ?? 0;
    const prevBestWord = existing?.best_word ?? null;
    const prevLongestWord = existing?.longest_word ?? null;
    const prevCurrentStreak = existing?.current_win_streak ?? 0;
    const prevBestStreak = existing?.best_win_streak ?? 0;

    const newCurrentStreak = isWinner ? prevCurrentStreak + 1 : (isDraw ? prevCurrentStreak : 0);
    const newBestStreak = Math.max(prevBestStreak, newCurrentStreak);
    const newBestWordScore = Math.max(prevBestWordScore, bestWordScore);
    const newBestWord = bestWordScore > prevBestWordScore ? bestWord : prevBestWord;
    const newLongestWord = longestWord && (!prevLongestWord || longestWord.length > prevLongestWord.length)
      ? longestWord
      : prevLongestWord;

    await supabase
      .from('player_stats')
      .upsert({
        user_id: playerId,
        games_played: prevGamesPlayed + 1,
        wins: prevWins + (isWinner ? 1 : 0),
        total_score: prevTotalScore + totalScore,
        best_word_score: newBestWordScore,
        best_word: newBestWord,
        longest_word: newLongestWord,
        current_win_streak: newCurrentStreak,
        best_win_streak: newBestStreak,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Upsert language stats
    if (totalWordsPlayed > 0) {
      for (const lang of languages) {
        const { data: langExisting } = await supabase
          .from('player_language_stats')
          .select('words_played')
          .eq('user_id', playerId)
          .eq('language', lang)
          .maybeSingle();

        const prevWords = langExisting?.words_played ?? 0;

        await supabase
          .from('player_language_stats')
          .upsert({
            user_id: playerId,
            language: lang,
            words_played: prevWords + totalWordsPlayed,
          }, { onConflict: 'user_id,language' });
      }
    }
  }

  // Mark game as stats computed
  await supabase
    .from('games')
    .update({ stats_computed: true })
    .eq('id', gameId);

  return { success: true };
}
