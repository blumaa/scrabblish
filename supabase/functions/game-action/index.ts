import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';
import { drawTiles, type Tile } from '../_shared/tile-bag.ts';
import { sendWebPush } from '../_shared/web-push.ts';
import { sendApnsPush } from '../_shared/apns.ts';
import { computeStats } from '../_shared/compute-stats.ts';

interface PlacedTile extends Tile {
  row: number;
  col: number;
}

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

    const body = await req.json();
    const { gameId, action, tiles, moveNumber, words } = body;

    if (!gameId || !action) {
      return new Response(JSON.stringify({ error: 'gameId and action required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // Use a transaction-like approach: SELECT FOR UPDATE
    // Supabase doesn't support raw SQL easily, so we use sequential checks
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameErr || !game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify it's this player's turn
    if (game.current_turn !== userId) {
      return new Response(JSON.stringify({ error: 'Not your turn' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify move number for concurrency
    if (moveNumber !== undefined && moveNumber !== game.move_number) {
      return new Response(JSON.stringify({ error: 'Stale move — game state changed' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get secrets
    const { data: secrets, error: secretErr } = await supabase
      .from('game_secrets')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (secretErr || !secrets) {
      return new Response(JSON.stringify({ error: 'Game data not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isP1 = game.player1_id === userId;
    const myHand = (isP1 ? secrets.player1_hand : secrets.player2_hand) as Tile[];
    const tileBag = secrets.tile_bag as Tile[];
    const boardState = game.board_state as (PlacedTile | null)[][];
    const opponentId = isP1 ? game.player2_id : game.player1_id;

    let newBoard = boardState;
    let newBag = tileBag;
    let newHand = myHand;
    let score = 0;
    let wordsFormed: { word: string; score: number }[] = [];

    if (action === 'submit') {
      const placedTiles = tiles as PlacedTile[];
      if (!placedTiles || placedTiles.length === 0) {
        return new Response(JSON.stringify({ error: 'No tiles placed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify tiles are in player's hand
      const handIds = new Set(myHand.map((t: Tile) => t.id));
      for (const t of placedTiles) {
        if (!handIds.has(t.id)) {
          return new Response(JSON.stringify({ error: `Tile ${t.id} not in your hand` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Place tiles on board
      newBoard = boardState.length > 0
        ? boardState.map((row: (PlacedTile | null)[]) => [...row])
        : Array.from({ length: 15 }, () => Array(15).fill(null));

      for (const t of placedTiles) {
        if (newBoard[t.row][t.col] !== null) {
          return new Response(JSON.stringify({ error: `Square ${t.row},${t.col} is occupied` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        newBoard[t.row][t.col] = t;
      }

      // TODO: validate placement rules and dictionary server-side
      // For MVP, we trust the client validation

      // Remove placed tiles from hand, draw new ones
      const placedIds = new Set(placedTiles.map((t: PlacedTile) => t.id));
      const remainingHand = myHand.filter((t: Tile) => !placedIds.has(t.id));
      const { drawn, remaining } = drawTiles(newBag, placedTiles.length);
      newHand = [...remainingHand, ...drawn];
      newBag = remaining;

      // TODO: calculate score server-side
      score = body.score ?? 0;

      // Store words from client for LastPlay display and stats
      if (Array.isArray(words) && words.length > 0) {
        // Support both formats: [{word, languages}] (new) or string[] (legacy)
        wordsFormed = words.map((w: unknown) => {
          if (typeof w === 'string') return { word: w, score: 0 };
          const obj = w as { word: string; languages?: string[] };
          return { word: obj.word, score: 0, languages: obj.languages ?? [] };
        });
      }
    } else if (action === 'exchange') {
      const tileIds = body.tileIds as string[];
      if (!tileIds || tileIds.length === 0) {
        return new Response(JSON.stringify({ error: 'No tiles selected for exchange' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tilesToSwap = myHand.filter((t: Tile) => tileIds.includes(t.id));
      const tilesToKeep = myHand.filter((t: Tile) => !tileIds.includes(t.id));
      const returnedBag = [...newBag, ...tilesToSwap];
      // Shuffle returned bag
      const shuffled = returnedBag.sort(() => Math.random() - 0.5);
      const { drawn, remaining } = drawTiles(shuffled, tilesToSwap.length);
      newHand = [...tilesToKeep, ...drawn];
      newBag = remaining;
    }

    // Check game over
    const gameFinished = newBag.length === 0 && newHand.length === 0;
    const newMoveNumber = game.move_number + 1;

    // Calculate updated scores
    const currentP1Score = (game.player1_score ?? 0) as number;
    const currentP2Score = (game.player2_score ?? 0) as number;
    const newP1Score = isP1 ? currentP1Score + score : currentP1Score;
    const newP2Score = isP1 ? currentP2Score : currentP2Score + score;

    // Determine winner if game finished
    const winnerId = gameFinished
      ? (newP1Score > newP2Score ? game.player1_id : newP2Score > newP1Score ? opponentId : null)
      : null;

    // Update game
    const { error: updateErr } = await supabase
      .from('games')
      .update({
        board_state: newBoard,
        move_number: newMoveNumber,
        current_turn: gameFinished ? null : opponentId,
        player1_score: newP1Score,
        player2_score: newP2Score,
        winner_id: winnerId,
        status: gameFinished ? 'finished' : 'active',
        updated_at: new Date().toISOString(),
        last_move_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('move_number', game.move_number); // optimistic concurrency

    if (updateErr) throw updateErr;

    // Insert move record
    await supabase.from('moves').insert({
      game_id: gameId,
      player_id: userId,
      move_number: newMoveNumber,
      move_type: action === 'submit' ? 'place' : 'exchange',
      tiles_placed: action === 'submit' ? tiles : null,
      words_formed: wordsFormed.length > 0 ? wordsFormed : null,
      score,
      tiles_exchanged_count: action === 'exchange' ? (body.tileIds?.length ?? 0) : null,
    });

    // Update secrets
    const secretUpdate: Record<string, unknown> = { tile_bag: newBag };
    if (isP1) {
      secretUpdate.player1_hand = newHand;
    } else {
      secretUpdate.player2_hand = newHand;
    }

    await supabase
      .from('game_secrets')
      .update(secretUpdate)
      .eq('game_id', gameId);

    // Send push notification to opponent (best-effort, don't block response)
    try {
      if (opponentId && !gameFinished) {
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('token, platform')
          .eq('user_id', opponentId);

        if (tokens && tokens.length > 0) {
          // Get opponent's notification preference
          const { data: profile } = await supabase
            .from('profiles')
            .select('notifications_enabled')
            .eq('id', opponentId)
            .single();

          if (profile?.notifications_enabled !== false) {
            const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
            const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
            const vapidSub = Deno.env.get('VAPID_SUBJECT') ?? '';

            for (const t of tokens) {
              const pushPayload = { title: 'Scrabblish', body: "It's your turn!", url: '/' };

              if (t.platform === 'web' && vapidPub && vapidPriv) {
                const success = await sendWebPush(
                  t.token,
                  pushPayload,
                  vapidPub,
                  vapidPriv,
                  vapidSub
                );
                if (!success) {
                  await supabase.from('push_tokens').delete().eq('token', t.token);
                }
              } else if (t.platform === 'ios') {
                const apnsKeyId = Deno.env.get('APNS_KEY_ID') ?? '';
                const apnsTeamId = Deno.env.get('APNS_TEAM_ID') ?? '';
                const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY') ?? '';
                const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'app.vercel.scrabblish';

                if (apnsKeyId && apnsTeamId && apnsPrivateKey) {
                  const success = await sendApnsPush(
                    t.token,
                    pushPayload,
                    apnsTeamId,
                    apnsKeyId,
                    apnsPrivateKey,
                    apnsBundleId,
                  );
                  if (!success) {
                    await supabase.from('push_tokens').delete().eq('token', t.token);
                  }
                }
              }
            }
          }
        }
      }
    } catch (pushErr) {
      console.error('Push notification failed (non-blocking):', pushErr);
    }

    // Compute stats when game finishes (best-effort, don't block response)
    if (gameFinished) {
      try {
        await computeStats(supabase, gameId);
      } catch (statsErr) {
        console.error('Stats computation failed (non-blocking):', statsErr);
      }
    }

    return new Response(
      JSON.stringify({
        hand: newHand,
        moveNumber: newMoveNumber,
        tilesRemaining: newBag.length,
        score,
        gameFinished,
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
