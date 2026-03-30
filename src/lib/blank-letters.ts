import type { Language } from '../types/game';

// Extra letters inserted after their base letter in the picker grid
const EXTRA_LETTERS: Partial<Record<Language, string[]>> = {
  de: ['Ä', 'Ö', 'Ü'],
  hu: ['Á', 'CS', 'É', 'GY', 'Í', 'LY', 'NY', 'Ó', 'Ö', 'Ő', 'SZ', 'TY', 'Ú', 'Ü', 'Ű', 'ZS'],
};

// Maps extra letters to the base letter they follow in alphabetical order
const INSERT_AFTER: Record<string, string> = {
  'Ä': 'A', 'Á': 'A',
  'CS': 'C',
  'É': 'E',
  'GY': 'G',
  'Í': 'I',
  'LY': 'L',
  'NY': 'N',
  'Ó': 'O', 'Ö': 'O', 'Ő': 'O',
  'SZ': 'S',
  'TY': 'T',
  'Ú': 'U', 'Ü': 'U', 'Ű': 'U',
  'ZS': 'Z',
};

/**
 * Get available letters for blank tile selection, ordered alphabetically
 * with language-specific letters inserted after their base letter.
 */
export function getAvailableLetters(languages: Language[]): string[] {
  const extras = new Set<string>();
  for (const lang of languages) {
    for (const letter of (EXTRA_LETTERS[lang] ?? [])) {
      extras.add(letter);
    }
  }

  const baseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const result: string[] = [];

  for (const letter of baseLetters) {
    result.push(letter);
    // Insert any extras that follow this base letter, in sorted order
    const toInsert = [...extras].filter((e) => INSERT_AFTER[e] === letter).sort();
    for (const extra of toInsert) {
      result.push(extra);
    }
  }

  return result;
}
