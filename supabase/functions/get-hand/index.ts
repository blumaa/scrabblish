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

    const { gameId } = await req.json();
    if (!gameId) {
      return new Response(JSON.stringify({ error: 'gameId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // Get game to verify player is a participant
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .select('player1_id, player2_id')
      .eq('id', gameId)
      .single();

    if (gameErr || !game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isP1 = game.player1_id === userId;
    const isP2 = game.player2_id === userId;
    if (!isP1 && !isP2) {
      return new Response(JSON.stringify({ error: 'Not a participant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get secrets
    const { data: secrets, error: secretErr } = await supabase
      .from('game_secrets')
      .select('player1_hand, player2_hand, tile_bag')
      .eq('game_id', gameId)
      .single();

    if (secretErr || !secrets) {
      return new Response(JSON.stringify({ error: 'Game data not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return only the requesting player's hand (never the opponent's)
    const hand = isP1 ? secrets.player1_hand : secrets.player2_hand;
    const tilesRemaining = (secrets.tile_bag as unknown[]).length;

    return new Response(
      JSON.stringify({ hand, tilesRemaining }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
