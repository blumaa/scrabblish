import type { WordFormed, Language } from '../types/game';
import { getWordLanguages, type DictionaryMap } from './dictionary';

export interface ValidatedWord {
  word: string;
  valid: boolean;
  languages: Language[];
  tiles: WordFormed['tiles'];
}

/**
 * Validate formed words against loaded dictionaries.
 * Returns validation results with language attribution.
 */
export function validateFormedWords(
  words: WordFormed[],
  dicts: DictionaryMap
): ValidatedWord[] {
  return words.map((w) => {
    const languages = getWordLanguages(dicts, w.word);
    return {
      word: w.word,
      valid: languages.length > 0,
      languages,
      tiles: w.tiles,
    };
  });
}
