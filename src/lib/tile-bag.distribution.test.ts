import { describe, it, expect } from 'vitest';
import { createMergedBag, drawTiles } from './tile-bag';

describe('tile distribution fairness', () => {
  it('merged EN+DE bag has ~42% vowels', () => {
    const bag = createMergedBag(['en', 'de']);
    const vowels = new Set(['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü']);
    const vowelCount = bag.filter((t) => vowels.has(t.letter)).length;
    const vowelPct = vowelCount / bag.length;
    // Standard Scrabble is ~42% vowels — should be between 38-46%
    expect(vowelPct).toBeGreaterThan(0.38);
    expect(vowelPct).toBeLessThan(0.46);
  });

  it('first 7 drawn tiles have at least 2 vowels on average', () => {
    const vowels = new Set(['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü']);
    let totalVowels = 0;
    const trials = 100;
    let zeroVowelHands = 0;

    for (let i = 0; i < trials; i++) {
      const bag = createMergedBag(['en', 'de']);
      const { drawn } = drawTiles(bag, 7);
      const handVowels = drawn.filter((t) => vowels.has(t.letter)).length;
      totalVowels += handVowels;
      if (handVowels === 0) zeroVowelHands++;
    }

    const avgVowels = totalVowels / trials;
    // With 42% vowels, expected ~2.94 vowels per hand of 7
    expect(avgVowels).toBeGreaterThan(2.0);
    expect(avgVowels).toBeLessThan(4.5);
    // Zero-vowel hands should be very rare (<5%)
    expect(zeroVowelHands / trials).toBeLessThan(0.05);
  });

  it('merged EN+DE bag contains German-specific letters Ä, Ö, Ü', () => {
    const bag = createMergedBag(['en', 'de']);
    const letters = new Set(bag.map((t) => t.letter));
    expect(letters.has('Ä')).toBe(true);
    expect(letters.has('Ö')).toBe(true);
    expect(letters.has('Ü')).toBe(true);
  });

  it('merged EN+HU bag contains Hungarian-specific letters', () => {
    const bag = createMergedBag(['en', 'hu']);
    const letters = new Set(bag.map((t) => t.letter));
    expect(letters.has('Á')).toBe(true);
    expect(letters.has('É')).toBe(true);
    expect(letters.has('Ő')).toBe(true);
    expect(letters.has('Ű')).toBe(true);
    expect(letters.has('CS')).toBe(true);
    expect(letters.has('GY')).toBe(true);
    expect(letters.has('SZ')).toBe(true);
  });

  it('merged EN+DE+HU bag contains all special letters from both', () => {
    const bag = createMergedBag(['en', 'de', 'hu']);
    const letters = new Set(bag.map((t) => t.letter));
    // German
    expect(letters.has('Ä')).toBe(true);
    // Hungarian
    expect(letters.has('Á')).toBe(true);
    expect(letters.has('CS')).toBe(true);
    expect(letters.has('TY')).toBe(true);
    expect(letters.has('ZS')).toBe(true);
    // Both have Ö and Ü
    expect(letters.has('Ö')).toBe(true);
    expect(letters.has('Ü')).toBe(true);
  });

  it('single language bag does NOT contain other language letters', () => {
    const enBag = createMergedBag(['en']);
    const enLetters = new Set(enBag.map((t) => t.letter));
    expect(enLetters.has('Ä')).toBe(false);
    expect(enLetters.has('Á')).toBe(false);
    expect(enLetters.has('CS')).toBe(false);
  });

  it('Ö count in EN+DE+HU is max of DE(1) and HU(2) = 2', () => {
    const bag = createMergedBag(['en', 'de', 'hu']);
    const oUmlautCount = bag.filter((t) => t.letter === 'Ö').length;
    expect(oUmlautCount).toBe(2); // HU has 2, DE has 1 → max is 2
  });

  it('shuffle produces different orderings', () => {
    const bags: string[][] = [];
    for (let i = 0; i < 5; i++) {
      const bag = createMergedBag(['en', 'de']);
      bags.push(bag.slice(0, 10).map((t) => t.id));
    }
    // At least 2 of 5 bags should have different first-10 orderings
    const unique = new Set(bags.map((b) => JSON.stringify(b)));
    expect(unique.size).toBeGreaterThan(1);
  });
});
