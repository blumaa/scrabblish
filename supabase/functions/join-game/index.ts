import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';
import { drawTiles, type Tile } from '../_shared/tile-bag.ts';

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

    const { joinCode, gameId: directGameId } = await req.json();

    const supabase = getServiceClient();
    let game: Record<string, unknown> | null = null;

    if (directGameId) {
      // Direct invitation acceptance — verify this user is the invited player
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', directGameId)
        .eq('invited_user_id', userId)
        .eq('status', 'waiting')
        .is('player2_id', null)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Invitation not found or expired' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      game = data;
    } else if (joinCode && typeof joinCode === 'string') {
      // Join by code
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
        .eq('status', 'waiting')
        .is('player2_id', null)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Game not found or already started' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      game = data;
    } else {
      return new Response(JSON.stringify({ error: 'Join code or game ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (game.player1_id === userId) {
      return new Response(JSON.stringify({ error: "You can't join your own game" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get secrets
    const { data: secrets, error: secretErr } = await supabase
      .from('game_secrets')
      .select('*')
      .eq('game_id', game.id)
      .single();

    if (secretErr || !secrets) {
      return new Response(JSON.stringify({ error: 'Game data not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deal hand to player2
    const tileBag = secrets.tile_bag as Tile[];
    const { drawn: hand2, remaining } = drawTiles(tileBag, 7);

    // Update game
    const { error: updateErr } = await supabase
      .from('games')
      .update({
        player2_id: userId,
        current_turn: userId, // accepting player goes first
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', game.id);

    if (updateErr) throw updateErr;

    // Update secrets
    const { error: secretUpdateErr } = await supabase
      .from('game_secrets')
      .update({
        player2_hand: hand2,
        tile_bag: remaining,
      })
      .eq('game_id', game.id);

    if (secretUpdateErr) throw secretUpdateErr;

    return new Response(
      JSON.stringify({
        id: game.id,
        languages: game.languages,
        hand: hand2,
        tilesRemaining: remaining.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
