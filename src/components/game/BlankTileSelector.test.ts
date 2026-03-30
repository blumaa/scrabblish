import { describe, it, expect } from 'vitest';

describe('blank tile letter selection', () => {
  it('generates correct letter options for EN+DE game', () => {
    const languages = ['en', 'de'] as const;
    // EN: A-Z (26 letters)
    // DE: A-Z + Ä, Ö, Ü (29 letters)
    // Combined unique: A-Z + Ä, Ö, Ü = 29
    const letters = getAvailableLetters(languages);
    expect(letters.length).toBe(29);
    expect(letters).toContain('A');
    expect(letters).toContain('Z');
    expect(letters).toContain('Ä');
    expect(letters).toContain('Ö');
    expect(letters).toContain('Ü');
  });

  it('generates correct letter options for EN-only game', () => {
    const languages = ['en'] as const;
    const letters = getAvailableLetters(languages);
    expect(letters.length).toBe(26);
    expect(letters).not.toContain('Ä');
  });

  it('letters are in alphabetical order with umlauts after base vowel', () => {
    const languages = ['en', 'de'] as const;
    const letters = getAvailableLetters(languages);
    const aIdx = letters.indexOf('A');
    const auIdx = letters.indexOf('Ä');
    const oIdx = letters.indexOf('O');
    const ouIdx = letters.indexOf('Ö');
    const uIdx = letters.indexOf('U');
    const uuIdx = letters.indexOf('Ü');
    expect(auIdx).toBe(aIdx + 1); // Ä right after A
    expect(ouIdx).toBe(oIdx + 1); // Ö right after O
    expect(uuIdx).toBe(uIdx + 1); // Ü right after U
  });
});

function getAvailableLetters(languages: readonly ('en' | 'de')[]): string[] {
  const baseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const extraLetters: Record<string, string[]> = {
    de: ['Ä', 'Ö', 'Ü'],
  };

  const extras = new Set<string>();
  for (const lang of languages) {
    for (const letter of (extraLetters[lang] ?? [])) {
      extras.add(letter);
    }
  }

  const result: string[] = [];
  for (const letter of baseLetters) {
    result.push(letter);
    // Insert umlauts right after their base vowel
    if (letter === 'A' && extras.has('Ä')) result.push('Ä');
    if (letter === 'O' && extras.has('Ö')) result.push('Ö');
    if (letter === 'U' && extras.has('Ü')) result.push('Ü');
  }

  return result;
}
