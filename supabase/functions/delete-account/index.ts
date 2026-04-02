import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // Find all games this user is part of
    const { data: userGames } = await supabase
      .from('games')
      .select('id')
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);

    const gameIds = (userGames ?? []).map((g: { id: string }) => g.id);

    if (gameIds.length > 0) {
      // Delete children of games first (FK cascade from games covers secrets)
      await supabase.from('moves').delete().in('game_id', gameIds).throwOnError();
      await supabase.from('game_secrets').delete().in('game_id', gameIds).throwOnError();
      await supabase.from('games').delete().in('id', gameIds).throwOnError();
    }

    // Delete remaining user data
    await supabase.from('push_tokens').delete().eq('user_id', userId).throwOnError();
    await supabase.from('player_language_stats').delete().eq('user_id', userId).throwOnError();
    await supabase.from('player_stats').delete().eq('user_id', userId).throwOnError();
    await supabase.from('friends').delete().or(`user_id.eq.${userId},friend_id.eq.${userId}`).throwOnError();
    await supabase.from('profiles').delete().eq('id', userId).throwOnError();

    // Delete the auth user last (invalidates all sessions)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
