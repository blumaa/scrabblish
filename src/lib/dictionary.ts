import type { Language } from '../types/game';

export type DictionaryMap = Map<Language, Set<string>>;

/**
 * Check if a word is valid in a specific language.
 */
export function isValidWord(
  dicts: DictionaryMap,
  word: string,
  language: Language
): boolean {
  const dict = dicts.get(language);
  if (!dict) return false;
  return dict.has(word.toUpperCase());
}

/**
 * Check if a word is valid in ANY loaded language.
 */
export function isValidInAny(
  dicts: DictionaryMap,
  word: string
): boolean {
  const upper = word.toUpperCase();
  for (const dict of dicts.values()) {
    if (dict.has(upper)) return true;
  }
  return false;
}

/**
 * Get all languages a word is valid in.
 * Returns empty array if not valid in any.
 */
export function getWordLanguages(
  dicts: DictionaryMap,
  word: string
): Language[] {
  const upper = word.toUpperCase();
  const langs: Language[] = [];
  for (const [lang, dict] of dicts.entries()) {
    if (dict.has(upper)) langs.push(lang);
  }
  return langs;
}

/**
 * Load a dictionary file (plain text or gzipped) and parse into a Set of uppercase words.
 */
export async function loadDictionary(url: string): Promise<Set<string>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load dictionary: ${response.status}`);

  let text: string;
  if (url.endsWith('.gz')) {
    const ds = new DecompressionStream('gzip');
    const decompressed = response.body!.pipeThrough(ds);
    text = await new Response(decompressed).text();
  } else {
    text = await response.text();
  }

  const words = new Set<string>();
  for (const line of text.split('\n')) {
    const word = line.trim();
    if (word.length >= 2) {
      words.add(word.toUpperCase());
    }
  }
  return words;
}

/**
 * Load dictionaries for the given languages.
 * Tries plain text first, falls back to gzip.
 */
export async function loadDictionaries(
  languages: Language[]
): Promise<DictionaryMap> {
  const dicts: DictionaryMap = new Map();
  const loads = languages.map(async (lang) => {
    // Try plain text first (dev), then gzip (production)
    const txtUrl = `/dictionaries/${lang}.v1.dict.txt`;
    const gzUrl = `/dictionaries/${lang}.v1.dict.gz`;
    try {
      const dict = await loadDictionary(txtUrl);
      dicts.set(lang, dict);
    } catch {
      const dict = await loadDictionary(gzUrl);
      dicts.set(lang, dict);
    }
  });
  await Promise.all(loads);
  return dicts;
}
