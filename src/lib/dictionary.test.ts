import { describe, it, expect } from 'vitest';
import {
  isValidWord,
  getWordLanguages,
  isValidInAny,
} from './dictionary';
import type { Language } from '../types/game';

// Test with small mock dictionaries (real dicts loaded at runtime)
function createMockDicts(): Map<Language, Set<string>> {
  const en = new Set(['HAND', 'CAT', 'DOG', 'HOUSE', 'THE', 'AT', 'HI']);
  const de = new Set(['HAND', 'HUND', 'HAUS', 'ÜBER', 'HÄNDE', 'DER']);
  return new Map<Language, Set<string>>([['en', en], ['de', de]]);
}

describe('dictionary', () => {
  describe('isValidWord', () => {
    it('returns true for a word in the specified language', () => {
      const dicts = createMockDicts();
      expect(isValidWord(dicts, 'CAT', 'en')).toBe(true);
    });

    it('returns false for a word not in the specified language', () => {
      const dicts = createMockDicts();
      expect(isValidWord(dicts, 'HUND', 'en')).toBe(false);
    });

    it('returns true for a German word', () => {
      const dicts = createMockDicts();
      expect(isValidWord(dicts, 'HAUS', 'de')).toBe(true);
    });

    it('handles umlauts correctly', () => {
      const dicts = createMockDicts();
      expect(isValidWord(dicts, 'ÜBER', 'de')).toBe(true);
      expect(isValidWord(dicts, 'HÄNDE', 'de')).toBe(true);
    });

    it('is case-insensitive (uppercases input)', () => {
      const dicts = createMockDicts();
      expect(isValidWord(dicts, 'cat', 'en')).toBe(true);
      expect(isValidWord(dicts, 'Cat', 'en')).toBe(true);
    });

    it('returns false for unknown language', () => {
      const dicts = createMockDicts();
      expect(isValidWord(dicts, 'HELLO', 'es' as Language)).toBe(false);
    });
  });

  describe('isValidInAny', () => {
    it('returns true if word exists in any loaded language', () => {
      const dicts = createMockDicts();
      expect(isValidInAny(dicts, 'CAT')).toBe(true);  // EN only
      expect(isValidInAny(dicts, 'HUND')).toBe(true);  // DE only
      expect(isValidInAny(dicts, 'HAND')).toBe(true);  // both
    });

    it('returns false if word exists in no language', () => {
      const dicts = createMockDicts();
      expect(isValidInAny(dicts, 'ZZZZZ')).toBe(false);
    });
  });

  describe('getWordLanguages', () => {
    it('returns all languages a word is valid in', () => {
      const dicts = createMockDicts();
      const langs = getWordLanguages(dicts, 'HAND');
      expect(langs).toContain('en');
      expect(langs).toContain('de');
      expect(langs.length).toBe(2);
    });

    it('returns single language for language-specific word', () => {
      const dicts = createMockDicts();
      expect(getWordLanguages(dicts, 'CAT')).toEqual(['en']);
      expect(getWordLanguages(dicts, 'HUND')).toEqual(['de']);
    });

    it('returns empty array for invalid word', () => {
      const dicts = createMockDicts();
      expect(getWordLanguages(dicts, 'ZZZZZ')).toEqual([]);
    });

    it('handles case insensitivity', () => {
      const dicts = createMockDicts();
      expect(getWordLanguages(dicts, 'hand')).toContain('en');
      expect(getWordLanguages(dicts, 'hand')).toContain('de');
    });
  });
});
