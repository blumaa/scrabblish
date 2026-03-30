import type { Language } from '../types/game';

interface MoveRecord {
  playerId: string;
  moveType: 'place' | 'exchange' | 'pass';
  score: number;
  wordsFormed: { word: string; score: number }[] | null;
}

interface PlayerGameStats {
  totalScore: number;
  bestWord: string | null;
  bestWordScore: number;
  longestWord: string | null;
  wordsPerLanguage: Map<string, number>;
}

export function extractBestWord(
  moves: MoveRecord[],
  playerId: string,
): { word: string; score: number } | null {
  let best: { word: string; score: number } | null = null;

  for (const m of moves) {
    if (m.playerId !== playerId || m.moveType !== 'place' || !m.wordsFormed) continue;
    for (const w of m.wordsFormed) {
      if (!best || w.score > best.score) {
        best = { word: w.word, score: w.score };
      }
    }
  }

  return best;
}

export function extractLongestWord(
  moves: MoveRecord[],
  playerId: string,
): string | null {
  let longest: string | null = null;

  for (const m of moves) {
    if (m.playerId !== playerId || m.moveType !== 'place' || !m.wordsFormed) continue;
    for (const w of m.wordsFormed) {
      if (!longest || w.word.length > longest.length || (w.word.length === longest.length && w.word < longest)) {
        longest = w.word;
      }
    }
  }

  return longest;
}

export function countWordsPerLanguage(
  moves: MoveRecord[],
  playerId: string,
  languages: Language[],
): Map<string, number> {
  let totalWords = 0;

  for (const m of moves) {
    if (m.playerId !== playerId || m.moveType !== 'place' || !m.wordsFormed) continue;
    totalWords += m.wordsFormed.length;
  }

  if (totalWords === 0) return new Map();

  const result = new Map<string, number>();
  for (const lang of languages) {
    result.set(lang, totalWords);
  }
  return result;
}

export function extractPlayerGameStats(
  moves: MoveRecord[],
  playerId: string,
  totalScore: number,
  languages: Language[],
): PlayerGameStats {
  const best = extractBestWord(moves, playerId);
  return {
    totalScore,
    bestWord: best?.word ?? null,
    bestWordScore: best?.score ?? 0,
    longestWord: extractLongestWord(moves, playerId),
    wordsPerLanguage: countWordsPerLanguage(moves, playerId, languages),
  };
}
