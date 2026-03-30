import { describe, it, expect } from 'vitest';
import { validateFormedWords } from './word-validation';
import { createEmptyBoard, getWordsFormedByMove } from './board-utils';
import type { PlacedTile, Language } from '../types/game';
import type { DictionaryMap } from './dictionary';

function tile(letter: string, row: number, col: number): PlacedTile {
  return { id: `${letter}-${row}-${col}`, letter, points: 1, isBlank: false, row, col };
}

function createDicts(): DictionaryMap {
  const en = new Set(['CAT', 'AT', 'HI', 'HAND', 'THE', 'AN']);
  const de = new Set(['HAND', 'DER', 'EIN', 'HAUS']);
  return new Map<Language, Set<string>>([['en', en], ['de', de]]);
}

describe('validateFormedWords', () => {
  it('marks valid English word', () => {
    const board = createEmptyBoard();
    const placed = [tile('C', 7, 6), tile('A', 7, 7), tile('T', 7, 8)];
    const words = getWordsFormedByMove(board, placed);
    const result = validateFormedWords(words, createDicts());

    expect(result.length).toBe(1);
    expect(result[0].word).toBe('CAT');
    expect(result[0].valid).toBe(true);
    expect(result[0].languages).toContain('en');
  });

  it('marks bilingual word with both languages', () => {
    const board = createEmptyBoard();
    const placed = [tile('H', 7, 6), tile('A', 7, 7), tile('N', 7, 8), tile('D', 7, 9)];
    const words = getWordsFormedByMove(board, placed);
    const result = validateFormedWords(words, createDicts());

    const handResult = result.find((r) => r.word === 'HAND');
    expect(handResult).toBeDefined();
    expect(handResult!.valid).toBe(true);
    expect(handResult!.languages).toContain('en');
    expect(handResult!.languages).toContain('de');
  });

  it('marks invalid word as invalid with empty languages', () => {
    const board = createEmptyBoard();
    const placed = [tile('Z', 7, 7), tile('Z', 7, 8)];
    const words = getWordsFormedByMove(board, placed);
    const result = validateFormedWords(words, createDicts());

    expect(result.length).toBe(1);
    expect(result[0].word).toBe('ZZ');
    expect(result[0].valid).toBe(false);
    expect(result[0].languages).toEqual([]);
  });

  it('returns allValid=true when all words are valid', () => {
    const board = createEmptyBoard();
    const placed = [tile('A', 7, 7), tile('T', 7, 8)];
    const words = getWordsFormedByMove(board, placed);
    const result = validateFormedWords(words, createDicts());

    expect(result.every((r) => r.valid)).toBe(true);
  });

  it('returns allValid=false when any word is invalid', () => {
    const board = createEmptyBoard();
    board[6][7] = tile('Z', 6, 7); // ZA vertical
    const placed = [tile('A', 7, 7), tile('T', 7, 8)];
    const words = getWordsFormedByMove(board, placed);
    const result = validateFormedWords(words, createDicts());

    // AT is valid, ZA is not
    const zaResult = result.find((r) => r.word === 'ZA');
    expect(zaResult?.valid).toBe(false);
  });
});
