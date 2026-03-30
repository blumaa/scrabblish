import type { Language } from '../types/game';

const EXTRA_LETTERS: Partial<Record<Language, string[]>> = {
  de: ['Ä', 'Ö', 'Ü'],
};

/**
 * Get available letters for blank tile selection, ordered alphabetically
 * with language-specific letters (umlauts) inserted after their base vowel.
 */
export function getAvailableLetters(languages: Language[]): string[] {
  const baseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const extras = new Set<string>();
  for (const lang of languages) {
    for (const letter of (EXTRA_LETTERS[lang] ?? [])) {
      extras.add(letter);
    }
  }

  const result: string[] = [];
  for (const letter of baseLetters) {
    result.push(letter);
    if (letter === 'A' && extras.has('Ä')) result.push('Ä');
    if (letter === 'O' && extras.has('Ö')) result.push('Ö');
    if (letter === 'U' && extras.has('Ü')) result.push('Ü');
  }

  return result;
}
