import { useState, useMemo } from 'react';
import { getWordsFormedByMove } from '../lib/board-utils';
import { validatePlacement } from '../lib/validation';
import { calculateMoveScore } from '../lib/scoring';
import { validateFormedWords, type ValidatedWord } from '../lib/word-validation';
import type { DictionaryMap } from '../lib/dictionary';
import type { Board, PlacedTile, Tile } from '../types/game';

interface GameInteractionConfig {
  board: Board;
  pendingTiles: PlacedTile[];
  isFirstMove: boolean;
  dicts: DictionaryMap | null;
  onPlaceTile: (tile: Tile, row: number, col: number) => void;
  onRecallTile: (tileId: string) => void;
  onRecallAll: () => void;
  onMovePendingTile: (tileId: string, row: number, col: number) => void;
  onShuffle: () => void;
  onSubmitValidated: (score: number, words: { word: string; languages: string[] }[]) => void;
  onError: (message: string) => void;
}

export function useGameInteraction(config: GameInteractionConfig) {
  const {
    board, pendingTiles, isFirstMove, dicts,
    onPlaceTile, onRecallTile, onRecallAll, onMovePendingTile,
    onShuffle, onSubmitValidated, onError,
  } = config;

  const [swapMode, setSwapMode] = useState(false);
  const [swapSelected, setSwapSelected] = useState<Set<string>>(new Set());
  const [blankPending, setBlankPending] = useState<{ tile: Tile; row: number; col: number } | null>(null);

  // Real-time word validation
  const validatedWords: ValidatedWord[] = useMemo(() => {
    if (!dicts || pendingTiles.length === 0) return [];
    const words = getWordsFormedByMove(board, pendingTiles);
    return validateFormedWords(words, dicts);
  }, [dicts, board, pendingTiles]);

  const handlePlaceTile = (tile: Tile, row: number, col: number) => {
    if (tile.isBlank) {
      setBlankPending({ tile, row, col });
      return;
    }
    onPlaceTile(tile, row, col);
  };

  const handleBlankLetterSelected = (letter: string) => {
    if (!blankPending) return;
    const assignedTile: Tile = { ...blankPending.tile, letter, points: 0 };
    onPlaceTile(assignedTile, blankPending.row, blankPending.col);
    setBlankPending(null);
  };

  const handleBlankCancelled = () => setBlankPending(null);

  const handleSubmit = () => {
    if (pendingTiles.length === 0) return;

    const validation = validatePlacement(board, pendingTiles, isFirstMove);
    if (!validation.valid) {
      onError(validation.error!);
      return;
    }

    const words = getWordsFormedByMove(board, pendingTiles);
    if (words.length === 0) {
      onError('No words formed');
      return;
    }

    if (dicts) {
      const validated = validateFormedWords(words, dicts);
      const invalidWords = validated.filter((v) => !v.valid);
      if (invalidWords.length > 0) {
        onError(`Invalid word${invalidWords.length > 1 ? 's' : ''}: ${invalidWords.map((w) => w.word).join(', ')}`);
        return;
      }
    }

    const newTileIds = new Set(pendingTiles.map((t) => t.id));
    const score = calculateMoveScore(words, newTileIds);

    // Include language attribution from dictionary validation
    const validated = dicts ? validateFormedWords(words, dicts) : [];
    const wordsWithLangs = words.map((w) => {
      const v = validated.find((vw) => vw.word === w.word);
      return { word: w.word, languages: v?.languages ?? [] };
    });
    onSubmitValidated(score, wordsWithLangs);
  };

  const handleEnterSwapMode = () => {
    if (pendingTiles.length > 0) onRecallAll();
    setSwapMode(true);
    setSwapSelected(new Set());
  };

  const handleCancelSwap = () => {
    setSwapMode(false);
    setSwapSelected(new Set());
  };

  const handleToggleSwapTile = (tileId: string) => {
    setSwapSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tileId)) next.delete(tileId);
      else next.add(tileId);
      return next;
    });
  };

  const resetSwap = () => {
    setSwapMode(false);
    setSwapSelected(new Set());
  };

  return {
    // State
    swapMode,
    swapSelected,
    blankPending,
    validatedWords,
    // Tile handlers
    handlePlaceTile,
    handleBlankLetterSelected,
    handleBlankCancelled,
    handleRecallTile: onRecallTile,
    handleRecallAll: onRecallAll,
    handleMovePendingTile: onMovePendingTile,
    handleShuffle: onShuffle,
    // Game flow
    handleSubmit,
    handleEnterSwapMode,
    handleCancelSwap,
    handleToggleSwapTile,
    resetSwap,
  };
}
