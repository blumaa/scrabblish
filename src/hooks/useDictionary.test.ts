import { describe, it, expect } from 'vitest';
import { isValidInAny, getWordLanguages } from '../lib/dictionary';
import type { Language } from '../types/game';

// Test the dictionary functions with realistic data
// The hook itself (useDictionary) is an async loader — tested via E2E

describe('dictionary integration', () => {
  // Simulate what the hook produces after loading
  function createRealisticDicts(): Map<Language, Set<string>> {
    const en = new Set([
      'HAND', 'CAT', 'DOG', 'HOUSE', 'THE', 'AT', 'HI', 'SPIKE',
      'WORD', 'PLAY', 'GAME', 'TILE', 'BOARD', 'LETTER', 'SCORE',
    ]);
    const de = new Set([
      'HAND', 'HUND', 'HAUS', 'ÜBER', 'HÄNDE', 'SPIEL', 'WORT',
      'BRETT', 'BUCHSTABE', 'PUNKT', 'DER', 'DIE', 'DAS',
    ]);
    return new Map<Language, Set<string>>([['en', en], ['de', de]]);
  }

  it('HAND is valid in both languages', () => {
    const dicts = createRealisticDicts();
    expect(isValidInAny(dicts, 'HAND')).toBe(true);
    const langs = getWordLanguages(dicts, 'HAND');
    expect(langs).toContain('en');
    expect(langs).toContain('de');
  });

  it('CAT is valid only in English', () => {
    const dicts = createRealisticDicts();
    expect(isValidInAny(dicts, 'CAT')).toBe(true);
    expect(getWordLanguages(dicts, 'CAT')).toEqual(['en']);
  });

  it('HAUS is valid only in German', () => {
    const dicts = createRealisticDicts();
    expect(isValidInAny(dicts, 'HAUS')).toBe(true);
    expect(getWordLanguages(dicts, 'HAUS')).toEqual(['de']);
  });

  it('ZZZZZ is not valid in any language', () => {
    const dicts = createRealisticDicts();
    expect(isValidInAny(dicts, 'ZZZZZ')).toBe(false);
    expect(getWordLanguages(dicts, 'ZZZZZ')).toEqual([]);
  });

  it('validates words case-insensitively', () => {
    const dicts = createRealisticDicts();
    expect(isValidInAny(dicts, 'hand')).toBe(true);
    expect(isValidInAny(dicts, 'Hand')).toBe(true);
    expect(isValidInAny(dicts, 'HAND')).toBe(true);
  });
});
