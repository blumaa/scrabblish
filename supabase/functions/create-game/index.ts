import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';
import { createMergedBag, drawTiles } from '../_shared/tile-bag.ts';

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

    const { languages, invitedUserId } = await req.json();
    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return new Response(JSON.stringify({ error: 'Languages required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // Generate unique join code
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let joinCode = '';
    const rand = new Uint32Array(8);
    crypto.getRandomValues(rand);
    for (let i = 0; i < 8; i++) {
      joinCode += chars[rand[i] % chars.length];
    }

    // Create tile bag and deal hand
    const bag = createMergedBag(languages);
    const { drawn: hand1, remaining } = drawTiles(bag, 7);

    // Insert game
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        join_code: joinCode,
        languages,
        player1_id: userId,
        invited_user_id: invitedUserId ?? null,
        current_turn: userId,
        board_state: [],
      })
      .select('id, join_code')
      .single();

    if (gameErr) throw gameErr;

    // Insert secrets
    const { error: secretErr } = await supabase
      .from('game_secrets')
      .insert({
        game_id: game.id,
        tile_bag: remaining,
        player1_hand: hand1,
        player2_hand: [],
      });

    if (secretErr) throw secretErr;

    return new Response(
      JSON.stringify({ id: game.id, joinCode: game.join_code, hand: hand1, tilesRemaining: remaining.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
