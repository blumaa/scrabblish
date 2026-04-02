import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { GameState, Board, PlacedTile, Tile, Language } from '../types/game';
import { createEmptyBoard } from '../lib/board-utils';

export interface CommittedWord {
  word: string;
  languages: string[];
  tiles: { row: number; col: number }[];
}

interface UseOnlineGameReturn {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  myHand: Tile[];
  totalTiles: number;
  committedWords: CommittedWord[];
  submitMove: (tiles: PlacedTile[], score: number, words: { word: string; languages: string[] }[]) => Promise<boolean>;
  exchangeTiles: (tileIds: string[]) => Promise<boolean>;
  refreshState: () => Promise<void>;
}

export function useOnlineGame(
  gameId: string,
  userId: string,
  callEdgeFunction: (name: string, body: Record<string, unknown>) => Promise<unknown>
): UseOnlineGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myHand, setMyHand] = useState<Tile[]>([]);
  const [committedWordsList, setCommittedWordsList] = useState<CommittedWord[]>([]);
  const [totalTiles, setTotalTiles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const moveNumberRef = useRef(0);

  const loadGame = useCallback(async () => {
    try {
      // Load game row
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameErr || !game) throw new Error('Game not found');

      // Load player profiles
      const playerIds = [game.player1_id, game.player2_id].filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', playerIds);

      const getUsername = (id: string) => {
        const p = profiles?.find((p: { id: string; username: string }) => p.id === id);
        return p?.username ?? 'Player';
      };

      // Load hand from Edge Function
      const handResult = await callEdgeFunction('get-hand', { gameId }) as { hand: Tile[]; tilesRemaining: number };

      const isP1 = game.player1_id === userId;
      const boardState = (game.board_state as (PlacedTile | null)[][] | null) ?? createEmptyBoard();
      // Ensure board is 15x15
      const board: Board = boardState.length === 15
        ? boardState
        : createEmptyBoard();

      moveNumberRef.current = game.move_number;

      // Load all moves for committed word language data + last play
      let lastPlay: GameState['lastPlay'] = null;
      interface CommittedWord {
        word: string;
        languages: string[];
        tiles: { row: number; col: number }[];
      }
      const committedWords: CommittedWord[] = [];

      if (game.move_number > 0) {
        const { data: allMoves } = await supabase
          .from('moves')
          .select('player_id, words_formed, tiles_placed, score, move_number')
          .eq('game_id', gameId)
          .eq('move_type', 'place')
          .order('move_number', { ascending: true });

        if (allMoves && allMoves.length > 0) {
          // Extract committed words with language data
          for (const move of allMoves) {
            const wordsFormed = move.words_formed as { word: string; languages?: string[] }[] | null;
            const tilesPlaced = move.tiles_placed as { row: number; col: number }[] | null;
            if (wordsFormed && tilesPlaced) {
              for (const w of wordsFormed) {
                committedWords.push({
                  word: w.word,
                  languages: w.languages ?? [],
                  tiles: tilesPlaced,
                });
              }
            }
          }

        }

        // Last move for LastPlay display (any move type, not just 'place')
        const { data: lastMoveRow } = await supabase
          .from('moves')
          .select('player_id, move_type, words_formed, tiles_exchanged_count, score')
          .eq('game_id', gameId)
          .order('move_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMoveRow) {
          const playerName = getUsername(lastMoveRow.player_id);
          if (lastMoveRow.move_type === 'exchange') {
            lastPlay = { playerName, words: ['swapped tiles'], score: 0 };
          } else if (lastMoveRow.words_formed) {
            const words = (lastMoveRow.words_formed as { word: string }[]).map((w) => w.word);
            lastPlay = { playerName, words, score: lastMoveRow.score };
          }
        }
      }

      const state: GameState = {
        gameId: game.id,
        joinCode: game.join_code,
        languages: game.languages as Language[],
        status: game.status,
        myPlayerId: userId,
        board,
        player1: {
          id: game.player1_id,
          displayName: getUsername(game.player1_id),
          rack: isP1 ? handResult.hand : [],
          score: (game.player1_score as number) ?? 0,
        },
        player2: {
          id: game.player2_id ?? '',
          displayName: game.player2_id ? getUsername(game.player2_id) : 'Waiting...',
          rack: isP1 ? [] : handResult.hand,
          score: (game.player2_score as number) ?? 0,
        },
        currentTurnPlayerId: game.current_turn,
        moveNumber: game.move_number,
        consecutivePasses: 0,
        tilesRemaining: handResult.tilesRemaining,
        winnerId: game.winner_id,
        pendingTiles: [],
        rackOrder: [],
        lastPlay,
        dictionaryLoaded: false,
        syncing: false,
        error: null,
      };

      // total = bag + both hands (14) + tiles on board
      const tilesOnBoard = board.flat().filter((t) => t !== null).length;
      setTotalTiles(handResult.tilesRemaining + 14 + tilesOnBoard);
      setGameState(state);
      setMyHand(handResult.hand);
      setCommittedWordsList(committedWords);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
      setLoading(false);
    }
  }, [gameId, userId, callEdgeFunction]);

  useEffect(() => { loadGame(); }, [loadGame]);

  // Realtime subscription for this game
  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          // Opponent made a move — apply the update from payload
          const newGame = payload.new as Record<string, unknown>;
          const newBoard = (newGame.board_state as (PlacedTile | null)[][] | null) ?? [];
          const board: Board = newBoard.length === 15 ? newBoard : createEmptyBoard();

          setGameState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              board,
              currentTurnPlayerId: newGame.current_turn as string | null,
              moveNumber: newGame.move_number as number,
              status: newGame.status as 'waiting' | 'active' | 'finished',
              winnerId: newGame.winner_id as string | null,
              player1: { ...prev.player1, score: (newGame.player1_score as number) ?? prev.player1.score },
              player2: { ...prev.player2, score: (newGame.player2_score as number) ?? prev.player2.score },
            };
          });

          moveNumberRef.current = newGame.move_number as number;

          // Refresh hand when it becomes our turn (opponent may have changed the bag)
          if (newGame.current_turn === userId) {
            callEdgeFunction('get-hand', { gameId }).then((result) => {
              const { hand } = result as { hand: Tile[]; tilesRemaining: number };
              setMyHand(hand);
            }).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, userId, callEdgeFunction]);

  const submitMove = useCallback(async (
    tiles: PlacedTile[],
    score: number,
    words: { word: string; languages: string[] }[]
  ): Promise<boolean> => {
    try {
      setError(null);
      const result = await callEdgeFunction('game-action', {
        gameId,
        action: 'submit',
        tiles,
        moveNumber: moveNumberRef.current,
        score,
        words,
      }) as { hand: Tile[]; moveNumber: number; tilesRemaining: number; gameFinished: boolean };

      setMyHand(result.hand);
      moveNumberRef.current = result.moveNumber;
      try {
        await loadGame();
      } catch {
        console.warn('Post-move refresh failed');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit move');
      return false;
    }
  }, [gameId, callEdgeFunction, loadGame]);

  const exchangeTiles = useCallback(async (tileIds: string[]): Promise<boolean> => {
    try {
      setError(null);
      const result = await callEdgeFunction('game-action', {
        gameId,
        action: 'exchange',
        tileIds,
        moveNumber: moveNumberRef.current,
      }) as { hand: Tile[]; moveNumber: number; tilesRemaining: number };

      setMyHand(result.hand);
      moveNumberRef.current = result.moveNumber;
      try {
        await loadGame();
      } catch {
        console.warn('Post-exchange refresh failed');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to exchange tiles');
      return false;
    }
  }, [gameId, callEdgeFunction, loadGame]);

  return {
    gameState,
    loading,
    error,
    totalTiles,
    committedWords: committedWordsList,
    myHand,
    submitMove,
    exchangeTiles,
    refreshState: loadGame,
  };
}
